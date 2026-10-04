import http from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioExecuteRequest, ScenarioPart } from '@platform/kit';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { 시나리오시험 } from '../execution/trial.js';
import scenarioTrialRoutes from './trialRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xstr-검사용-세션-열쇠-32글자를-넘긴다-넉넉히-됩니다';
const 번호들 = ['XSTR-001', 'XSTR-UI-001'];
const 계정들 = ['xstr-a', 'xstr-b', 'xstr-c'];

const 소스 = `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'XSTR-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('담는다', async () => {
    await page.getByRole('button').click();
  });
  await test.step('한 건이다', async () => {
    await verify('한 건이다', 1, 1, { blocker: true });
  });
});
`;

describe.skipIf(연결 === undefined)('시나리오 시험 실행 통로', () => {
  let app: FastifyInstance;
  let 러너: http.Server;
  const 서비스id: Record<string, number> = {};
  const 출입증 = new Map<string, string>();
  const 받은요청: ScenarioExecuteRequest[] = [];
  const 매달린것: http.ServerResponse[] = [];
  let 매단다 = false;
  let 뿌리 = '';
  let 사진뿌리 = '';
  const 원래 = {
    tests: process.env.PLATFORM_TESTS_DIR,
    artifacts: process.env.PLATFORM_ARTIFACTS_DIR,
    runner: process.env.RUNNER_URL,
  };
  const 답 = { status: 'PASS', durationMs: 4, parts: [{ seq: 1, status: 'PASS', durationMs: 4, mocks: [], steps: [] }] };

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
  const 본문 = (덧: Record<string, unknown> = {}) => ({
    service: 'XSTR',
    env: 'qa',
    platform: 'desktop',
    parts: [케이스('XSTR-001')],
    ...덧,
  });
  const 부른다 = (사람: string, method: 'GET' | 'POST', url: string, payload?: Record<string, unknown>) =>
    app.inject({ method, url, payload, cookies: { platform_session: 출입증.get(사람)! } });
  const 풀어준다 = () => {
    for (const res of 매달린것.splice(0)) {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(답));
    }
  };

  async function 계정(username: string, prefix: string): Promise<void> {
    await q(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $1, $2, 'member', 'none', true, false)
       ON CONFLICT (username) DO UPDATE SET is_active = true, is_approved = true, must_change_password = false`,
      [username, await 해시('열려라참깨')],
    );
    await q('DELETE FROM user_service WHERE username = $1', [username]);
    await q(
      `INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', 'write', 'none')`,
      [username, 서비스id[prefix]],
    );
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    출입증.set(username, res.cookies[0]!.value);
  }

  beforeAll(async () => {
    러너 = http.createServer((req, res) => {
      const 조각: Buffer[] = [];
      req.on('data', (c: Buffer) => 조각.push(c));
      req.on('end', () => {
        받은요청.push(JSON.parse(Buffer.concat(조각).toString('utf8')) as ScenarioExecuteRequest);
        if (매단다) {
          매달린것.push(res);
          return;
        }
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(답));
      });
    });
    await new Promise<void>((ok) => 러너.listen(0, '127.0.0.1', ok));
    process.env.RUNNER_URL = `http://127.0.0.1:${(러너.address() as AddressInfo).port}`;

    뿌리 = await mkdtemp(join(tmpdir(), 'xstr-'));
    사진뿌리 = await mkdtemp(join(tmpdir(), 'xstr-art-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    process.env.PLATFORM_ARTIFACTS_DIR = 사진뿌리;
    await mkdir(join(뿌리, 'xstr'));
    await writeFile(join(뿌리, 'xstr', 'a.spec.ts'), 소스);

    for (const prefix of ['XSTR', 'XSTR2']) {
      const r = await q(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
              VALUES ($1, $1, '#3A5FCD', '', 'xstr')
         ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
        [prefix],
      );
      서비스id[prefix] = Number((r.rows[0] as { id: string }).id);
    }
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스id.XSTR]);
    await q(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://xstr.example')`, [서비스id.XSTR]);
    for (const tcId of 번호들) {
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active)
         VALUES ($1, $1, '["desktop"]', '[]', 'xstr/a.spec.ts', '{"type":"object"}', '{"type":"object"}', true)
         ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = true`,
        [tcId],
      );
    }

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(scenarioTrialRoutes, { prefix: '/api' });
    await app.ready();

    await 계정('xstr-a', 'XSTR');
    await 계정('xstr-b', 'XSTR');
    await 계정('xstr-c', 'XSTR2');
  });

  beforeEach(() => {
    풀어준다();
    매단다 = false;
    시나리오시험.전부비운다();
  });

  afterAll(async () => {
    풀어준다();
    await app.close();
    await new Promise((ok) => 러너.close(ok));
    await q('DELETE FROM user_service WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스id.XSTR]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = ANY($1)', [Object.values(서비스id)]);
    await rm(뿌리, { recursive: true, force: true });
    await rm(사진뿌리, { recursive: true, force: true });
    for (const [키, 값] of [
      ['PLATFORM_TESTS_DIR', 원래.tests],
      ['PLATFORM_ARTIFACTS_DIR', 원래.artifacts],
      ['RUNNER_URL', 원래.runner],
    ] as const) {
      if (값 === undefined) delete process.env[키];
      else process.env[키] = 값;
    }
  });

  it('시작하면 202 와 trialId 이고 끝나면 FINISHED 와 결과다', async () => {
    const res = await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문());
    expect(res.statusCode).toBe(202);
    const { trialId } = res.json<{ trialId: string }>();
    await vi.waitFor(async () =>
      expect((await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}`)).json()).toEqual({ status: 'FINISHED', result: 답 }),
    );
    expect(받은요청.at(-1)).toMatchObject({ runId: null, trialId });
  });

  it('돌고 있는 동안은 RUNNING 이고 같은 사람이 또 시작하면 409 TRIAL_BUSY 다', async () => {
    매단다 = true;
    const { trialId } = (await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문())).json<{ trialId: string }>();
    expect((await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}`)).json()).toEqual({ status: 'RUNNING' });
    const 두번째 = await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문());
    expect(두번째.statusCode).toBe(409);
    expect(두번째.json()).toEqual({ error: 'TRIAL_BUSY', detail: '이미 시험 실행이 돌고 있습니다' });
  });

  it('남의 시험은 같은 서비스 사람도 · 다른 서비스 사람도 404 TRIAL_NOT_FOUND 다', async () => {
    매단다 = true;
    const { trialId } = (await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문())).json<{ trialId: string }>();
    for (const 사람 of ['xstr-b', 'xstr-c']) {
      for (const url of [`/api/scenario-trials/${trialId}`, `/api/scenario-trials/${trialId}/screenshots/1`]) {
        const res = await 부른다(사람, 'GET', url);
        expect(res.statusCode, `${사람} ${url}`).toBe(404);
        expect(res.json(), `${사람} ${url}`).toEqual({ error: 'TRIAL_NOT_FOUND', detail: trialId });
      }
    }
  });

  it('조립 거절 · 본문 모양 · 대상 서버 없음은 400 이다', async () => {
    const 거절 = await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문({ parts: [케이스('XSTR-UI-001')] }));
    expect(거절.statusCode).toBe(400);
    expect(거절.json()).toMatchObject({ error: 'INVALID_REQUEST', detail: expect.stringContaining('UI 테스트') });
    expect((await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문({ platform: 'tv' }))).json()).toMatchObject({
      error: 'INVALID_REQUEST',
    });
    expect((await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문({ env: 'nope' }))).json()).toMatchObject({
      error: 'ENV_NOT_FOUND',
    });
  });

  it('사진은 시작한 사람에게만 png 다 — 없는 사진 404 · 번호 모양 아님 404 · seq 숫자 아님 400', async () => {
    const { trialId } = (await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문())).json<{ trialId: string }>();
    await mkdir(join(사진뿌리, 'runs', 'trial', trialId), { recursive: true });
    await writeFile(join(사진뿌리, 'runs', 'trial', trialId, '3.png'), 'png');

    const 사진 = await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}/screenshots/3`);
    expect(사진.statusCode).toBe(200);
    expect(사진.headers['content-type']).toBe('image/png');
    expect((await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}/screenshots/4`)).json()).toMatchObject({
      error: 'SCREENSHOT_NOT_FOUND',
    });
    expect((await 부른다('xstr-a', 'GET', '/api/scenario-trials/..%2F..%2Fetc/screenshots/3')).statusCode).toBe(404);
    expect((await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}/screenshots/x`)).statusCode).toBe(400);
  });
});

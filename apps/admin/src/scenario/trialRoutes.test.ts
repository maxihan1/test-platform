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
import { enqueue, limit } from '../execution/dispatcher.js';
import { 시나리오시험 } from '../execution/trial.js';
import { 상태찾기 } from './trialAbort.js';
import scenarioTrialRoutes from './trialRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xstr-검사용-세션-열쇠-32글자를-넘긴다-넉넉히-됩니다';
const 번호들 = ['XSTR-001', 'XSTR-UI-001'];
const 계정들 = ['xstr-a', 'xstr-b', 'xstr-c', 'xstr-d'];

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
  // 러너 GET /progress 의 scenarios · POST /abort 로 받은 본문 · 그 답
  let 러너진행: object[] = [];
  const 받은중단: unknown[] = [];
  let 중단답 = true;
  const 끊긴답 = { status: 'NA', durationMs: 2, error: { message: 'ABORTED' }, parts: [{ seq: 1, status: 'NA', durationMs: 1, mocks: [], steps: [], error: { message: 'ABORTED' } }] };
  // 러너가 쥔 장면 — 열쇠마다 마지막 한 장. 없는 열쇠는 러너처럼 404 다
  const 장면 = new Map<string, Buffer>();
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

  async function 계정(username: string, prefix: string, runs = 'write'): Promise<void> {
    await q(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $1, $2, 'member', 'none', true, false)
       ON CONFLICT (username) DO UPDATE SET is_active = true, is_approved = true, must_change_password = false`,
      [username, await 해시('열려라참깨')],
    );
    await q('DELETE FROM user_project WHERE username = $1', [username]);
    await q(
      `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) SELECT $1, project_id, 'read', $3, 'none' FROM service WHERE id = $2`,
      [username, 서비스id[prefix], runs],
    );
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    출입증.set(username, res.cookies[0]!.value);
  }

  beforeAll(async () => {
    러너 = http.createServer((req, res) => {
      const 장면열쇠 = /^\/live\/(.+)$/.exec(req.url ?? '')?.[1];
      if (req.method === 'GET' && 장면열쇠 !== undefined) {
        const 장 = 장면.get(장면열쇠);
        return void (장 === undefined ? res.writeHead(404).end('{}') : res.writeHead(200, { 'content-type': 'image/jpeg' }).end(장));
      }
      if (req.method === 'GET' && req.url === '/progress') return void res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ items: [], scenarios: 러너진행 }));
      if (req.method === 'GET') return void res.writeHead(req.url === '/health' ? 200 : 404).end('{}');
      const 조각: Buffer[] = [];
      req.on('data', (c: Buffer) => 조각.push(c));
      req.on('end', () => {
        if (req.url === '/abort') {
          받은중단.push(JSON.parse(Buffer.concat(조각).toString('utf8')));
          // 진짜 러너처럼 끊으면 매달린 /execute-scenario 가 끊긴 답으로 돌아온다
          if (중단답) for (const 매달림 of 매달린것.splice(0)) 매달림.setHeader('content-type', 'application/json'), 매달림.end(JSON.stringify(끊긴답));
          res.setHeader('content-type', 'application/json');
          return void res.end(JSON.stringify({ aborted: 중단답 }));
        }
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
    await 계정('xstr-d', 'XSTR', 'trial');
  });

  beforeEach(() => {
    풀어준다();
    매단다 = false;
    러너진행 = [];
    받은중단.length = 0;
    중단답 = true;
    장면.clear();
    시나리오시험.전부비운다();
  });

  afterAll(async () => {
    풀어준다();
    await app.close();
    await new Promise((ok) => 러너.close(ok));
    await q('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스id.XSTR]);
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [서비스id.XSTR]);
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스id.XSTR]);
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

  it('장면은 도는 동안 시작한 사람에게만 한 장씩 주고 끝나면 404 다', async () => {
    매단다 = true;
    const { trialId } = (await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문())).json<{ trialId: string }>();
    const 장면주소 = `/api/scenario-trials/${trialId}/live`;
    await vi.waitFor(() => expect(받은요청.at(-1)).toMatchObject({ trialId, live: trialId }));
    expect((await 부른다('xstr-a', 'GET', 장면주소)).statusCode).toBe(204);

    장면.set(trialId, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    const 한장 = await 부른다('xstr-a', 'GET', 장면주소);
    expect(한장.statusCode).toBe(200);
    expect(한장.headers['content-type']).toBe('image/jpeg');
    expect(한장.headers['cache-control']).toBe('no-store');
    expect((await 부른다('xstr-b', 'GET', 장면주소)).statusCode).toBe(404);

    풀어준다();
    await vi.waitFor(async () => expect((await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}`)).json<{ status: string }>().status).toBe('FINISHED'));
    expect((await 부른다('xstr-a', 'GET', 장면주소)).json()).toEqual({ error: 'TRIAL_NOT_FOUND', detail: trialId });
  });

  it('돌고 있는 동안은 RUNNING 이고 같은 사람이 또 시작하면 409 TRIAL_BUSY 다', async () => {
    매단다 = true;
    const { trialId } = (await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문())).json<{ trialId: string }>();
    expect((await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}`)).json()).toEqual({ status: 'RUNNING' });
    const 두번째 = await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문());
    expect(두번째.statusCode).toBe(409);
    expect(두번째.json()).toEqual({ error: 'TRIAL_BUSY', detail: '이미 시험 실행이 돌고 있습니다' });
  });

  it('러너에 보낸 시험은 RUNNING 에 지금 부품(step)이 붙고, 다른 시험의 진행은 섞이지 않는다', async () => {
    매단다 = true;
    const { trialId } = (await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문())).json<{ trialId: string }>();
    await vi.waitFor(() => expect(받은요청.at(-1)).toMatchObject({ trialId }));
    러너진행 = [
      { runId: null, trialId: '다른-시험', seq: 5, elapsedMs: 9 },
      { runId: 42, seq: 4, elapsedMs: 8 },
      { runId: null, trialId, seq: 2, elapsedMs: 300 },
    ];

    // 러너 진행 답은 받은 뒤 1초 동안 모든 시험이 함께 쓴다 — 앞 검사가 받은 답이 지나야 새 답이 보인다
    await vi.waitFor(
      async () =>
        expect((await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}`)).json()).toEqual({ status: 'RUNNING', step: { seq: 2, elapsedMs: 300 } }),
      { timeout: 3_000, interval: 200 },
    );
  });

  it('중단 — 러너에 보낸 뒤면 러너에 끊어 달라 하고 결과는 러너 답이되 머리와 돌던 부품은 ABORTED 가 아니라 STOPPED 다', async () => {
    매단다 = true;
    const { trialId } = (await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문())).json<{ trialId: string }>();
    await vi.waitFor(() => expect(상태찾기(trialId)?.보냄).toBe(true));

    const res = await 부른다('xstr-a', 'POST', `/api/scenario-trials/${trialId}/abort`);

    expect(res.json()).toEqual({ aborted: true });
    expect(받은중단).toEqual([{ scenarioTrialId: trialId }]);
    await vi.waitFor(async () => {
      const 읽음 = (await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}`)).json<{ status: string; result?: { error?: { message: string }; parts: { error?: { message: string } }[] } }>();
      expect(읽음.status).toBe('FINISHED');
      expect(읽음.result?.error?.message).toBe('STOPPED');
      expect(읽음.result?.parts[0]?.error?.message).toBe('STOPPED');
    });
  });

  it('중단 — 러너가 모르는 번호면 aborted false 다', async () => {
    매단다 = true;
    중단답 = false;
    const { trialId } = (await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문())).json<{ trialId: string }>();
    await vi.waitFor(() => expect(상태찾기(trialId)?.보냄).toBe(true));

    expect((await 부른다('xstr-a', 'POST', `/api/scenario-trials/${trialId}/abort`)).json()).toEqual({ aborted: false });
  });

  it('중단 — 줄에서 기다리는 동안이면 admin 이 NA · STOPPED(부품은 NOT_RUN)로 닫고 러너에 보내지 않는다', async () => {
    const 풀어줄것: (() => void)[] = [];
    let 풀림 = false;
    // 앞서 도는 일이 자리를 쥐고 있으면 막이 일부가 나중에야 시작한다 — 풀린 뒤에 시작하는 것은 바로 끝나게 한다
    const 막이 = Array.from({ length: limit() }, () => enqueue(() => new Promise<void>((ok) => (풀림 ? ok() : 풀어줄것.push(ok)))));
    try {
      const { trialId } = (await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문())).json<{ trialId: string }>();

      const res = await 부른다('xstr-a', 'POST', `/api/scenario-trials/${trialId}/abort`);

      expect(res.json()).toEqual({ aborted: true });
      expect(받은중단).toEqual([]);
      const 읽음 = (await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}`)).json<{ status: string; result: { status: string; error: { message: string }; parts: { status: string; error: { message: string } }[] } }>();
      expect(읽음.status).toBe('FINISHED');
      expect(읽음.result).toMatchObject({ status: 'NA', error: { message: 'STOPPED' } });
      expect(읽음.result.parts.map((p) => [p.status, p.error.message])).toEqual([['NA', 'NOT_RUN']]);

      풀림 = true;
      for (const 풀 of 풀어줄것) 풀();
      await vi.waitFor(() => expect(상태찾기(trialId)).toBeUndefined());
      expect(받은요청.some((r) => r.trialId === trialId)).toBe(false);
    } finally {
      풀림 = true;
      for (const 풀 of 풀어줄것) 풀();
      await Promise.all(막이);
    }
  });

  it('중단 — 남의 시험은 404 · 이미 끝난 시험은 aborted false 다', async () => {
    const { trialId } = (await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문())).json<{ trialId: string }>();
    await vi.waitFor(async () => expect((await 부른다('xstr-a', 'GET', `/api/scenario-trials/${trialId}`)).json<{ status: string }>().status).toBe('FINISHED'));

    const 남 = await 부른다('xstr-b', 'POST', `/api/scenario-trials/${trialId}/abort`);
    expect(남.statusCode).toBe(404);
    expect(남.json()).toEqual({ error: 'TRIAL_NOT_FOUND', detail: trialId });
    expect((await 부른다('xstr-a', 'POST', `/api/scenario-trials/${trialId}/abort`)).json()).toEqual({ aborted: false });
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

  it('실행 trial 은 케이스 조립을 시험 실행하고 저장된 시나리오에 없는 모킹은 403 · 저장된 뒤에는 202 다 — write 는 안 거른다', async () => {
    expect((await 부른다('xstr-d', 'POST', '/api/scenario-trials', 본문())).statusCode).toBe(202);
    const 모킹 = { kind: 'mock', urlPattern: '**/x', status: 200, contentType: 'text/html', body: '<p>x</p>' };
    const 막힘 = await 부른다('xstr-d', 'POST', '/api/scenario-trials', 본문({ parts: [모킹, 케이스('XSTR-001')] }));
    expect(막힘.statusCode).toBe(403);
    expect(막힘.json()).toEqual({ error: 'FORBIDDEN', need: 'runs:write', detail: '1번 단계(모킹)는 저장된 시나리오에 있는 것만 시험 실행할 수 있습니다' });
    expect((await 부른다('xstr-a', 'POST', '/api/scenario-trials', 본문({ parts: [모킹, 케이스('XSTR-001')] }))).statusCode).toBe(202);

    const 저장 = await q(`INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'xstr', 'xstr-a') RETURNING id`, [서비스id.XSTR]);
    await q(`INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, $2, 'xstr-a', 'xstr-a')`, [
      (저장.rows[0] as { id: string }).id,
      JSON.stringify([모킹, 케이스('XSTR-001')]),
    ]);
    시나리오시험.전부비운다();
    expect((await 부른다('xstr-d', 'POST', '/api/scenario-trials', 본문({ parts: [모킹, 케이스('XSTR-001')] }))).statusCode).toBe(202);
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

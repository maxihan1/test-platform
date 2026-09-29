import http from 'node:http';
import type { AddressInfo } from 'node:net';

import type { ExecuteRequest } from '@platform/kit';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { 전부비운다 } from './trial.js';
import trialRoutes from './trialRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XTR';
const 열쇠 = 'xtr-검사용-세션-열쇠-32글자를-넘긴다-넉넉히-됩니다';
const 케이스 = 'XTR-001';
const 데스크톱만 = 'XTR-002';
const 계정들 = ['xtr-writer', 'xtr-other', 'xtr-reader'];

const 입력스키마 = {
  type: 'object',
  properties: {
    loginId: { type: 'string', minLength: 1, default: 'guest', description: '아이디' },
    password: { type: 'string', secret: true, default: '', description: '비밀번호' },
    count: { type: 'number', default: 1, description: '개수' },
  },
  required: ['loginId'],
};
const 기대스키마 = { type: 'object', properties: { homePath: { type: 'string', default: '/', description: '첫 화면' } } };

describe.skipIf(연결 === undefined)('케이스 테스트 실행 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 출입증 = new Map<string, string>();
  const 받은요청: ExecuteRequest[] = [];
  let 러너: http.Server;
  let 러너주소 = '';
  let 러너응답: () => unknown = () => ({});
  const 멈춤 = Symbol('멈춤');
  const 매달린것: http.ServerResponse[] = [];
  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };
  const 행수 = async () =>
    [(await q('SELECT count(*)::int AS n FROM test_run')).rows[0].n, (await q('SELECT count(*)::int AS n FROM run_item')).rows[0].n];

  async function 계정(username: string, runs: 'read' | 'write'): Promise<void> {
    await q(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $1, $2, 'member', 'none', true, false)
       ON CONFLICT (username) DO UPDATE SET is_active = true, is_approved = true, must_change_password = false`,
      [username, await 해시('열려라참깨')],
    );
    await q('DELETE FROM user_service WHERE username = $1', [username]);
    await q(
      `INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, 'none')`,
      [username, 서비스, runs],
    );
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    출입증.set(username, res.cookies[0]!.value);
  }

  beforeAll(async () => {
    러너 = http.createServer((req, res) => {
      const 조각: Buffer[] = [];
      req.on('data', (c: Buffer) => 조각.push(c));
      req.on('end', () => {
        받은요청.push(JSON.parse(Buffer.concat(조각).toString('utf8')) as ExecuteRequest);
        const 답 = 러너응답();
        if (답 === 멈춤) {
          매달린것.push(res);
          return;
        }
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(답));
      });
    });
    await new Promise<void>((ok) => 러너.listen(0, '127.0.0.1', ok));
    러너주소 = `http://127.0.0.1:${(러너.address() as AddressInfo).port}`;

    const r = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XTR 테스트 실행 검사용', '#3A5FCD', '', 'xtr')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number((r.rows[0] as { id: string }).id);
    for (const [id, 플랫폼들] of [
      [케이스, '["desktop","mobile"]'],
      [데스크톱만, '["desktop"]'],
    ] as const) {
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, 'XTR 로그인', $2, '[]', 'xtr/a.spec.ts', $3, $4)
         ON CONFLICT (tc_id) DO UPDATE SET platforms = EXCLUDED.platforms, param_schema = EXCLUDED.param_schema, expected_schema = EXCLUDED.expected_schema`,
        [id, 플랫폼들, JSON.stringify(입력스키마), JSON.stringify(기대스키마)],
      );
    }

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(trialRoutes, { prefix: '/api' });
    await app.ready();

    await 계정('xtr-writer', 'write');
    await 계정('xtr-other', 'write');
    await 계정('xtr-reader', 'read');
  });

  afterAll(async () => {
    await q('DELETE FROM user_service WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [[케이스, 데스크톱만]]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
    for (const res of 매달린것) res.end('{}');
    await new Promise((ok) => 러너.close(ok));
    delete process.env.LOCAL_RUNNER_URL;
  });

  beforeEach(() => {
    전부비운다();
    받은요청.length = 0;
    process.env.LOCAL_RUNNER_URL = 러너주소;
    러너응답 = () => ({ historyId: 1, status: 'PASS', durationMs: 5, steps: [] });
  });

  const 시작 = (body: unknown, 누구 = 'xtr-writer', tcId = 케이스) =>
    app.inject({
      method: 'POST',
      url: `/api/cases/${tcId}/test-run`,
      cookies: { platform_session: 출입증.get(누구)! },
      payload: body as object,
    });
  const 읽기 = (trialId: string, 누구 = 'xtr-writer', tcId = 케이스) =>
    app.inject({ method: 'GET', url: `/api/cases/${tcId}/test-run/${trialId}`, cookies: { platform_session: 출입증.get(누구)! } });
  const 정상 = { platform: 'desktop', baseUrl: 'https://qa.example.com', params: { loginId: 'u', password: 'p4ss!' }, expected: {} };

  async function 끝날때까지(trialId: string, 누구 = 'xtr-writer'): Promise<Record<string, unknown>> {
    for (let i = 0; i < 100; i += 1) {
      const 본문 = (await 읽기(trialId, 누구)).json<Record<string, unknown>>();
      if (본문.status === 'DONE') return 본문;
      await new Promise((ok) => setTimeout(ok, 20));
    }
    throw new Error('끝나지 않았다');
  }

  it('LOCAL_RUNNER_URL 이 없으면 409 TRIAL_OFF 다 — 기본값이 없다', async () => {
    delete process.env.LOCAL_RUNNER_URL;
    const res = await 시작(정상);
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: string; detail: string }>()).toEqual({
      error: 'TRIAL_OFF',
      detail: '이 서버에는 테스트 실행이 켜져 있지 않습니다. 켜는 법은 docs/SETUP.md 의 「내 컴퓨터 러너」를 보세요',
    });
  });

  it('http·https 가 아닌 주소는 400 이다', async () => {
    for (const baseUrl of ['file:///etc/passwd', 'javascript:alert(1)', '그냥글자', 'ftp://x.example.com']) {
      const res = await 시작({ ...정상, baseUrl });
      expect(res.statusCode, baseUrl).toBe(400);
    }
    expect(받은요청).toEqual([]);
  });

  it('없는 케이스는 404, 지원하지 않는 환경은 400 이다', async () => {
    expect((await 시작(정상, 'xtr-writer', 'XTR-999')).statusCode).toBe(404);
    const res = await 시작({ ...정상, platform: 'mobile' }, 'xtr-writer', 데스크톱만);
    expect(res.statusCode).toBe(400);
  });

  it('명세에 어긋나면 400 INVALID_PARAMS 와 칸별 사유다', async () => {
    const res = await 시작({ ...정상, params: { loginId: 'u', count: '셋' } });
    expect(res.statusCode).toBe(400);
    const 본문 = res.json<{ error: string; violations: { path: string }[] }>();
    expect(본문.error).toBe('INVALID_PARAMS');
    expect(본문.violations.map((v) => v.path)).toEqual(['count']);
    expect(받은요청).toEqual([]);
  });

  it('통과하면 202 와 trialId 를 주고 러너에 케이스 1건을 보낸다', async () => {
    const res = await 시작(정상);
    expect(res.statusCode).toBe(202);
    const { trialId } = res.json<{ trialId: string }>();
    expect(trialId).toMatch(/^[0-9a-f-]{36}$/);

    const 끝 = await 끝날때까지(trialId);
    expect(끝).toMatchObject({ status: 'DONE', result: { status: 'PASS' } });
    expect(받은요청).toHaveLength(1);
    expect(받은요청[0]).toMatchObject({
      runId: 0,
      tcId: 케이스,
      platform: 'desktop',
      filePath: 'xtr/a.spec.ts',
      baseUrl: 'https://qa.example.com',
      params: { loginId: 'u', password: 'p4ss!' },
      timeoutMs: 300000,
    });
    expect(받은요청[0]!.historyId).toBeGreaterThan(0);
  });

  it('실행 기록(test_run·run_item)을 만들지 않는다', async () => {
    const 전 = await 행수();
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    await 끝날때까지(trialId);
    expect(await 행수()).toEqual(전);
  });

  it('시작한 사람만 읽는다 — 남이 읽으면 404 다', async () => {
    러너응답 = () => ({ historyId: 1, status: 'PASS', durationMs: 5, steps: [] });
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    expect((await 읽기(trialId, 'xtr-other')).statusCode).toBe(404);
    expect((await 읽기('없는-번호')).statusCode).toBe(404);
    expect((await 읽기(trialId)).statusCode).toBe(200);
  });

  it('러너에 못 닿으면 DONE 과 NA 안내 문장이다', async () => {
    process.env.LOCAL_RUNNER_URL = 'http://127.0.0.1:1';
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    const 끝 = await 끝날때까지(trialId);
    expect(끝).toMatchObject({
      status: 'DONE',
      result: { status: 'NA', error: { message: '내 컴퓨터 러너에 닿지 못했습니다. 맥에서 npm run runner:local 을 켜 두었는지 보세요' } },
    });
  });

  it('응답 어디에도 비밀번호 원문이 없다', async () => {
    러너응답 = () => ({
      historyId: 1,
      status: 'FAIL',
      durationMs: 5,
      steps: [{ seq: 1, title: '비밀번호 p4ss! 입력', status: 'FAIL', durationMs: 1, assertions: [] }],
      error: { message: 'p4ss! 로 실패' },
    });
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    await 끝날때까지(trialId);
    expect((await 읽기(trialId)).body).not.toContain('p4ss!');
  });

  it('같은 사람이 돌리는 중에 또 누르면 409 TRIAL_BUSY 다', async () => {
    러너응답 = () => 멈춤;
    const 첫 = await 시작(정상);
    expect(첫.statusCode).toBe(202);
    const 둘째 = await 시작(정상);
    expect(둘째.statusCode).toBe(409);
    expect(둘째.json<{ error: string }>().error).toBe('TRIAL_BUSY');
  });

  it('실행 read 만 있는 사람은 시작이 403 이다', async () => {
    const res = await 시작(정상, 'xtr-reader');
    expect(res.statusCode).toBe(403);
    expect(받은요청).toEqual([]);
  });
});

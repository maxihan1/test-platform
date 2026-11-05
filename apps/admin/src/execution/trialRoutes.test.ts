import http from 'node:http';
import type { AddressInfo } from 'node:net';

import type { ExecuteRequest } from '@platform/kit';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { enqueue } from './dispatcher.js';
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
  // 러너가 쥔 장면 — 열쇠마다 마지막 한 장. 없는 열쇠는 러너처럼 404 다
  const 장면 = new Map<string, Buffer>();
  const 폰화면 = 'https://vision.example.com/#phone=s1&view=xtr-view';
  // 러너 GET /progress 가 내는 절차들 · 물은 횟수, POST /abort 로 받은 번호와 그 답
  let 진행답: { historyId: number; seq: number; title: string; elapsedMs: number }[] = [];
  let 진행물음 = 0;
  const 받은중단: number[] = [];
  let 중단답 = true;
  const 옛환경 = {
    RUNNER_URL: process.env.RUNNER_URL,
    DEVICE_FARM_URL: process.env.DEVICE_FARM_URL,
    EXECUTION_CONCURRENCY: process.env.EXECUTION_CONCURRENCY,
    LOCAL_RUNNER_URL: process.env.LOCAL_RUNNER_URL,
  };
  const 끝낸다 = (답: unknown = { historyId: 1, status: 'PASS', durationMs: 5, steps: [] }) => {
    for (const res of 매달린것.splice(0)) res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(답));
  };
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
    await q('DELETE FROM user_project WHERE username = $1', [username]);
    await q(
      `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) SELECT $1, project_id, 'read', $3, 'none' FROM service WHERE id = $2`,
      [username, 서비스, runs],
    );
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    출입증.set(username, res.cookies[0]!.value);
  }

  beforeAll(async () => {
    // 한 서버가 서버 러너와 Device VISION 둘 다 흉내 낸다
    러너 = http.createServer((req, res) => {
      const 장면열쇠 = /^\/live\/(.+)$/.exec(req.url ?? '')?.[1];
      if (req.method === 'GET' && 장면열쇠 !== undefined) {
        const 장 = 장면.get(장면열쇠);
        return void (장 === undefined ? res.writeHead(404).end('{}') : res.writeHead(200, { 'content-type': 장[0] === 0x89 ? 'image/png' : 'image/jpeg' }).end(장));
      }
      if (req.method === 'GET' && req.url === '/api/devices') {
        const 목록 = { value: { devices: [{ serial: 's1', state: 'IDLE' }] } };
        return void res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(목록));
      }
      if (req.url === '/api/devices/s1/hold') {
        req.resume();
        const 답 = req.method === 'POST' ? JSON.stringify({ held: { until: 0, now: 0, screen: 폰화면 } }) : '{}';
        return void res.writeHead(200, { 'content-type': 'application/json' }).end(답);
      }
      if (req.method === 'GET' && req.url === '/progress') {
        진행물음 += 1;
        return void res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ items: 진행답 }));
      }
      if (req.method === 'GET') return void res.writeHead(req.url === '/health' ? 200 : 404).end('{}');
      if (req.url === '/abort') {
        const 조각: Buffer[] = [];
        req.on('data', (c: Buffer) => 조각.push(c));
        req.on('end', () => {
          받은중단.push((JSON.parse(Buffer.concat(조각).toString('utf8')) as { historyId: number }).historyId);
          res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ aborted: 중단답 }));
        });
        return;
      }
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
    await q(`DELETE FROM service_env WHERE service_id = $1`, [서비스]);
    await q(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'https://qa.example.com')`, [서비스]);
    for (const [id, 플랫폼들] of [
      [케이스, '["desktop","mobile","android"]'],
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
    await q('DELETE FROM case_input WHERE tc_id = ANY($1)', [[케이스, 데스크톱만]]);
    await q('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [[케이스, 데스크톱만]]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
    끝낸다();
    await new Promise((ok) => 러너.close(ok));
    for (const [이름, 값] of Object.entries(옛환경)) {
      if (값 === undefined) delete process.env[이름];
      else process.env[이름] = 값;
    }
  });

  beforeEach(() => {
    끝낸다();
    전부비운다();
    받은요청.length = 0;
    받은중단.length = 0;
    진행답 = [];
    중단답 = true;
    장면.clear();
    process.env.RUNNER_URL = 러너주소;
    delete process.env.DEVICE_FARM_URL;
    delete process.env.EXECUTION_CONCURRENCY;
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
  const 장면읽기 = (trialId: string, 누구 = 'xtr-writer') =>
    app.inject({ method: 'GET', url: `/api/cases/${케이스}/test-run/${trialId}/live`, cookies: { platform_session: 출입증.get(누구)! } });
  const 중단 = (trialId: string, 누구 = 'xtr-writer', tcId = 케이스) =>
    app.inject({ method: 'POST', url: `/api/cases/${tcId}/test-run/${trialId}/abort`, cookies: { platform_session: 출입증.get(누구)! } });
  const 정상 = { platform: 'desktop', env: 'qa', params: { loginId: 'u', password: 'p4ss!' }, expected: {} };
  const 러너에닿을때까지 = async (건수: number) => {
    for (let i = 0; i < 100 && 받은요청.length < 건수; i += 1) await new Promise((ok) => setTimeout(ok, 20));
    expect(받은요청).toHaveLength(건수);
  };

  async function 끝날때까지(trialId: string, 누구 = 'xtr-writer'): Promise<Record<string, unknown>> {
    for (let i = 0; i < 100; i += 1) {
      const 본문 = (await 읽기(trialId, 누구)).json<Record<string, unknown>>();
      if (본문.status === 'DONE') return 본문;
      await new Promise((ok) => setTimeout(ok, 20));
    }
    throw new Error('끝나지 않았다');
  }

  it('LOCAL_RUNNER_URL 이 없어도 서버 러너로 돈다 — TRIAL_OFF 는 없다', async () => {
    delete process.env.LOCAL_RUNNER_URL;
    const res = await 시작(정상);
    expect(res.statusCode).toBe(202);
    expect(await 끝날때까지(res.json<{ trialId: string }>().trialId)).toMatchObject({ status: 'DONE', result: { status: 'PASS' } });
    expect(받은요청).toHaveLength(1);
  });

  it('대상 서버 이름이 없거나 그 애플리케이션에 없는 이름이면 400 ENV_NOT_FOUND 다', async () => {
    const 빈이름 = await 시작({ ...정상, env: undefined, baseUrl: 'https://qa.example.com' });
    expect(빈이름.statusCode).toBe(400);
    expect(빈이름.json()).toEqual({ error: 'ENV_NOT_FOUND', detail: '대상 서버를 고르지 않았습니다' });
    const 모르는이름 = await 시작({ ...정상, env: 'prod' });
    expect(모르는이름.statusCode).toBe(400);
    expect(모르는이름.json()).toEqual({ error: 'ENV_NOT_FOUND', detail: 'XTR 에 prod 대상 서버가 없습니다' });
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

  it('요청에 없는 칸은 케이스 저장값으로 채워 러너에 보내고 결과에는 비밀값이 없다', async () => {
    await q(
      `INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ($1, $2, '{}', 'xtr-writer')
       ON CONFLICT (tc_id) DO UPDATE SET params = EXCLUDED.params`,
      [케이스, JSON.stringify({ loginId: '저장한아이디', password: '저장한비번!' })],
    );
    try {
      const res = await 시작({ ...정상, params: {} });
      expect(res.statusCode).toBe(202);
      const 끝 = await 끝날때까지(res.json<{ trialId: string }>().trialId);
      expect(받은요청[0]!.params).toMatchObject({ loginId: '저장한아이디', password: '저장한비번!' });
      expect(JSON.stringify(끝)).not.toContain('저장한비번!');
    } finally {
      await q('DELETE FROM case_input WHERE tc_id = $1', [케이스]);
    }
  });

  it('그래도 빈 계정 칸은 고른 대상 서버 줄의 계정으로 채우고 결과에는 비밀번호가 없다', async () => {
    await q(`INSERT INTO service_env (service_id, env, base_url, login_password) VALUES ($1, 'stg', 'https://stg.example.com', 'xtr-stg-비번')`, [서비스]);
    await q(`UPDATE service_env SET login_password = 'xtr-qa-비번' WHERE service_id = $1 AND env = 'qa'`, [서비스]);
    try {
      const 끝 = await 끝날때까지((await 시작({ ...정상, params: { loginId: 'u' } })).json<{ trialId: string }>().trialId);
      expect(받은요청[0]!.params).toEqual({ loginId: 'u', password: 'xtr-qa-비번' });
      expect(JSON.stringify(끝)).not.toContain('xtr-qa-비번');

      await 끝날때까지((await 시작({ ...정상, env: 'stg', params: { loginId: 'u' } })).json<{ trialId: string }>().trialId);
      expect(받은요청[1]).toMatchObject({ baseUrl: 'https://stg.example.com', params: { loginId: 'u', password: 'xtr-stg-비번' } });
    } finally {
      await q(`DELETE FROM service_env WHERE service_id = $1 AND env = 'stg'`, [서비스]);
      await q(`UPDATE service_env SET login_password = NULL WHERE service_id = $1 AND env = 'qa'`, [서비스]);
    }
  });

  it('통과하면 202 와 trialId 를 주고 서버 러너에 케이스 1건을 장면 열쇠와 함께 보낸다', async () => {
    const res = await 시작({ ...정상, baseUrl: 'http://169.254.169.254' });
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
      // 본문에 실은 주소는 안 본다 — 고른 대상 서버 줄의 주소다
      baseUrl: 'https://qa.example.com',
      params: { loginId: 'u', password: 'p4ss!' },
      timeoutMs: 300000,
      live: trialId,
    });
    expect(받은요청[0]!.historyId).toBeGreaterThan(0);
  });

  it('브라우저 테스트 실행은 동시 실행 자리를 기다린다 — 자리가 나면 그때 러너에 간다', async () => {
    process.env.EXECUTION_CONCURRENCY = '1';
    let 비운다: () => void = () => undefined;
    const 앞일 = enqueue(() => new Promise<void>((ok) => (비운다 = ok)));
    try {
      const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
      await new Promise((ok) => setTimeout(ok, 100));
      expect(받은요청).toEqual([]);
      expect((await 읽기(trialId)).json()).toEqual({ status: 'RUNNING' });
      // 러너가 아직 이 열쇠를 모른다 — 장면이 없을 뿐이다
      expect((await 장면읽기(trialId)).statusCode).toBe(204);
      비운다();
      await 앞일;
      await 끝날때까지(trialId);
      expect(받은요청).toHaveLength(1);
    } finally {
      비운다();
    }
  });

  it('장면은 도는 동안 시작한 사람에게만 한 장씩 주고 끝나면 404 다', async () => {
    러너응답 = () => 멈춤;
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    await 러너에닿을때까지(1);
    expect((await 장면읽기(trialId)).statusCode).toBe(204);

    장면.set(trialId, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    const 한장 = await 장면읽기(trialId);
    expect(한장.statusCode).toBe(200);
    expect(한장.headers['content-type']).toBe('image/jpeg');
    expect(한장.headers['cache-control']).toBe('no-store');
    expect([...한장.rawPayload]).toEqual([0xff, 0xd8, 0xff, 0xd9]);
    expect((await 장면읽기(trialId, 'xtr-other')).statusCode).toBe(404);
    expect((await 장면읽기('44444444-4444-4444-8444-444444444444')).statusCode).toBe(404);

    // 서버 러너가 잠들었으면 기다림으로 가리지 않고 502 다
    process.env.RUNNER_URL = 'http://127.0.0.1:1';
    const 못닿음 = await 장면읽기(trialId);
    expect(못닿음.statusCode).toBe(502);
    expect(못닿음.json<{ error: string }>().error).toBe('RUNNER_UNREACHABLE');
    process.env.RUNNER_URL = 러너주소;

    끝낸다();
    await 끝날때까지(trialId);
    expect((await 장면읽기(trialId)).json()).toEqual({ error: 'TRIAL_NOT_FOUND', detail: trialId });
  });

  it('Android 앱 테스트 실행은 팜 빈 폰을 잡고 도는 동안 그 폰 화면 링크와 장면 열쇠를 싣는다 — 폰 장면은 PNG 그대로 건넨다', async () => {
    process.env.DEVICE_FARM_URL = 러너주소;
    러너응답 = () => 멈춤;
    const 폰 = await 시작({ ...정상, platform: 'android' });
    expect(폰.statusCode).toBe(202);
    const { trialId } = 폰.json<{ trialId: string }>();
    await 러너에닿을때까지(1);
    expect(받은요청[0]).toMatchObject({ platform: 'android', udid: 's1', baseUrl: 'https://qa.example.com' });
    expect(받은요청[0]!.live).toBe(trialId);
    expect((await 읽기(trialId)).json()).toEqual({ status: 'RUNNING', vision: { url: 폰화면 } });
    expect((await 장면읽기(trialId)).statusCode).toBe(204);
    장면.set(trialId, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const 한장 = await 장면읽기(trialId);
    expect(한장.headers['content-type']).toBe('image/png');
    expect([...한장.rawPayload]).toEqual([0x89, 0x50, 0x4e, 0x47]);

    끝낸다();
    const 끝 = await 끝날때까지(trialId);
    expect('vision' in 끝).toBe(false);
  });

  it('이 서버에 Device VISION 이 없으면 Android 앱 테스트 실행은 409 FARM_OFF 다', async () => {
    const res = await 시작({ ...정상, platform: 'android' });
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: string }>().error).toBe('FARM_OFF');
    expect(받은요청).toEqual([]);
  });

  it('게임 애플리케이션의 android 테스트 실행은 엔진 GAME 과 그 줄의 어드민 키를 싣고, 다른 환경은 안 싣는다', async () => {
    process.env.DEVICE_FARM_URL = 러너주소;
    await q(`UPDATE service SET kind = 'GAME' WHERE id = $1`, [서비스]);
    await q(`UPDATE service_env SET admin_key = $2 WHERE service_id = $1 AND env = 'qa'`, [서비스, JSON.stringify({ header: 'X-Admin-Key', value: 'xtr-key' })]);
    try {
      const 폰 = await 시작({ ...정상, platform: 'android' });
      expect(폰.statusCode).toBe(202);
      await 끝날때까지(폰.json<{ trialId: string }>().trialId);
      const 웹 = await 시작(정상);
      await 끝날때까지(웹.json<{ trialId: string }>().trialId);
      expect(받은요청.map((r) => [r.platform, r.engine, r.adminKey])).toEqual([
        ['android', 'GAME', { header: 'X-Admin-Key', value: 'xtr-key' }],
        ['desktop', undefined, undefined],
      ]);
    } finally {
      await q(`UPDATE service_env SET admin_key = NULL WHERE service_id = $1 AND env = 'qa'`, [서비스]);
      await q(`UPDATE service SET kind = 'SCREEN' WHERE id = $1`, [서비스]);
    }
  });

  it('실행 기록(test_run·run_item)을 만들지 않는다', async () => {
    const 전 = await 행수();
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    await 끝날때까지(trialId);
    expect(await 행수()).toEqual(전);
  });

  it('시작한 사람만 읽는다 — 남이 읽으면 404 다', async () => {
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    expect((await 읽기(trialId, 'xtr-other')).statusCode).toBe(404);
    expect((await 읽기('없는-번호')).statusCode).toBe(404);
    expect((await 읽기(trialId)).statusCode).toBe(200);
  });

  it('그 케이스 주소로만 읽는다 — 문은 주소의 tcId 로 권한을 봐서 다른 케이스 주소로는 404 다', async () => {
    러너응답 = () => 멈춤;
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    await 러너에닿을때까지(1);
    expect((await 읽기(trialId, 'xtr-writer', 데스크톱만)).statusCode).toBe(404);
    const 다른주소장면 = await app.inject({
      method: 'GET',
      url: `/api/cases/${데스크톱만}/test-run/${trialId}/live`,
      cookies: { platform_session: 출입증.get('xtr-writer')! },
    });
    expect(다른주소장면.statusCode).toBe(404);
    expect((await 읽기(trialId)).statusCode).toBe(200);
  });

  it('같은 밀리초에 눌러도 러너에 가는 번호(historyId)가 겹치지 않는다', async () => {
    const 하나 = (await 시작(정상)).json<{ trialId: string }>().trialId;
    const 둘 = (await 시작(정상, 'xtr-other')).json<{ trialId: string }>().trialId;
    await 끝날때까지(하나);
    await 끝날때까지(둘, 'xtr-other');
    expect(new Set(받은요청.map((r) => r.historyId)).size).toBe(2);
  });

  it('서버 러너에 못 닿으면 DONE 과 NA 안내 문장이다', async () => {
    process.env.RUNNER_URL = 'http://127.0.0.1:1';
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    const 끝 = await 끝날때까지(trialId);
    expect(끝).toMatchObject({ status: 'DONE', result: { status: 'NA', error: { message: '러너에 닿지 못했습니다' } } });
  });

  it('실패하면 DONE 에 정식 실행과 같은 실패 유형과 한 줄을 싣고 통과면 null 이다', async () => {
    러너응답 = () => ({
      historyId: 1,
      status: 'FAIL',
      durationMs: 5,
      steps: [{ seq: 6, title: '구매하기를 누른다', status: 'FAIL', durationMs: 1, assertions: [], error: { message: 'locator.click: Timeout' } }],
      error: { message: 'Error: Can\'t call click on element with selector "id=buy_now_button" because element wasn\'t found' },
    });
    const 실패 = await 끝날때까지((await 시작(정상)).json<{ trialId: string }>().trialId);
    expect(실패).toMatchObject({ status: 'DONE', failure: { type: 'notFound' } });
    expect((실패.failure as { reason: string }).reason).toContain('buy_now_button');

    러너응답 = () => ({ historyId: 1, status: 'PASS', durationMs: 5, steps: [] });
    expect(await 끝날때까지((await 시작(정상)).json<{ trialId: string }>().trialId)).toMatchObject({ status: 'DONE', failure: null });
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

  it('러너에 보낸 시험은 지금 단계를 싣는다 — 러너 진행은 1초 동안 함께 쓴다', async () => {
    러너응답 = () => 멈춤;
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    await 러너에닿을때까지(1);
    진행답 = [
      { historyId: 받은요청[0]!.historyId, seq: 3, title: '비밀번호 입력', elapsedMs: 4000 },
      { historyId: 1, seq: 9, title: '남의 정식 실행 단계', elapsedMs: 1 },
    ];
    await new Promise((ok) => setTimeout(ok, 1100));
    const 앞 = 진행물음;
    expect((await 읽기(trialId)).json()).toEqual({ status: 'RUNNING', step: { seq: 3, title: '비밀번호 입력', elapsedMs: 4000 } });
    expect((await 읽기(trialId)).json()).toMatchObject({ step: { seq: 3 } });
    expect(진행물음 - 앞).toBe(1);

    끝낸다();
    expect(await 끝날때까지(trialId)).not.toHaveProperty('step');
  });

  it('차례를 기다리는 시험은 러너에 단계를 묻지 않고, 중단하면 러너에 안 보내고 NA · ABORTED 로 닫는다', async () => {
    process.env.EXECUTION_CONCURRENCY = '1';
    let 비운다: () => void = () => undefined;
    const 앞일 = enqueue(() => new Promise<void>((ok) => (비운다 = ok)));
    try {
      const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
      await new Promise((ok) => setTimeout(ok, 1100));
      const 앞 = 진행물음;
      expect((await 읽기(trialId)).json()).toEqual({ status: 'RUNNING' });
      expect(진행물음).toBe(앞);

      const 답 = await 중단(trialId);
      expect(답.statusCode).toBe(200);
      expect(답.json()).toEqual({ aborted: true });
      expect(await 끝날때까지(trialId)).toMatchObject({ status: 'DONE', result: { status: 'NA', error: { message: 'ABORTED' }, steps: [] } });
      // 닫혔으니 바로 새로 시작할 수 있다
      러너응답 = () => 멈춤;
      expect((await 시작(정상)).statusCode).toBe(202);

      비운다();
      await 앞일;
      await 러너에닿을때까지(1);
      expect(받은요청[0]!.live).not.toBe(trialId);
      expect(받은중단).toEqual([]);
    } finally {
      비운다();
    }
  });

  it('러너에 보낸 시험의 중단은 러너 /abort 로 끊고 결과는 러너 답 그대로다', async () => {
    러너응답 = () => 멈춤;
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    await 러너에닿을때까지(1);

    expect((await 중단(trialId)).json()).toEqual({ aborted: true });
    expect(받은중단).toEqual([받은요청[0]!.historyId]);
    expect((await 읽기(trialId)).json()).toMatchObject({ status: 'RUNNING' });
    끝낸다({ historyId: 받은요청[0]!.historyId, status: 'TIMEOUT', durationMs: 5, steps: [] });
    expect(await 끝날때까지(trialId)).toMatchObject({ result: { status: 'TIMEOUT' } });

    // 끝난 시험은 오류가 아니라 false 다
    expect((await 중단(trialId)).json()).toEqual({ aborted: false });
  });

  it('러너가 못 끊었다고 답하면 false 다', async () => {
    러너응답 = () => 멈춤;
    중단답 = false;
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    await 러너에닿을때까지(1);
    expect((await 중단(trialId)).json()).toEqual({ aborted: false });
  });

  it('남의 시험 · 다른 케이스 주소 · 없는 번호의 중단은 404 다', async () => {
    러너응답 = () => 멈춤;
    const { trialId } = (await 시작(정상)).json<{ trialId: string }>();
    await 러너에닿을때까지(1);
    expect((await 중단(trialId, 'xtr-other')).statusCode).toBe(404);
    expect((await 중단(trialId, 'xtr-writer', 데스크톱만)).statusCode).toBe(404);
    expect((await 중단('44444444-4444-4444-8444-444444444444')).json()).toEqual({ error: 'TRIAL_NOT_FOUND', detail: '44444444-4444-4444-8444-444444444444' });
    expect((await 중단(trialId, 'xtr-reader')).statusCode).toBe(403);
    expect(받은중단).toEqual([]);
  });

  it('실행 read 만 있는 사람은 시작이 403 이다', async () => {
    const res = await 시작(정상, 'xtr-reader');
    expect(res.statusCode).toBe(403);
    expect(받은요청).toEqual([]);
  });
});

// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 시나리오시험 } from '../execution/trial.js';

import { 에이전트토큰만들기 } from './agentToken.js';
import { 권한이되나, 옛자동규칙, 인증등록 } from './gate.js';
import { 해시 } from './password.js';
import { 관리자권한, type 기능, type 서비스권한 } from './permissions.js';
import { 등급표, 필요권한 } from './routeTable.js';
import authRoutes from './routes.js';
import { 라우트표 } from './scope.js';
import { 세션등록 } from './session.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xfu3-검사용-세션-열쇠-32글자를-넘긴다';

describe.skipIf(연결 === undefined)('인증 미들웨어', () => {
  let app: FastifyInstance;
  const 서비스id: Record<string, number> = {};

  async function 서비스넣기(prefix: string, name: string) {
    const { pool } = await import('../db/index.js');
    const rows = await pool.query<{ id: number }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#223344', 'https://example.com/x', 'x')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [prefix, name],
    );
    서비스id[prefix] = rows.rows[0]!.id;
  }

  const 읽기셋: 서비스권한 = { cases: 'read', runs: 'read', authoring: 'read' };
  const 쓰기셋: 서비스권한 = { cases: 'write', runs: 'write', authoring: 'write' };

  async function 계정넣기(username: string, role: 'member' | 'admin', 배정: Record<string, 서비스권한>, 변경강제 = false) {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $1, $2, $3, 'read', true, $4)
       ON CONFLICT (username) DO UPDATE SET is_active = true, role = EXCLUDED.role,
                                            password_hash = EXCLUDED.password_hash,
                                            is_approved = true, must_change_password = EXCLUDED.must_change_password`,
      [username, await 해시('열려라참깨'), role, 변경강제],
    );
    for (const [prefix, 칸] of Object.entries(배정)) {
      await pool.query(
        `INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring)
              VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username, service_id) DO UPDATE
           SET perm_cases = EXCLUDED.perm_cases, perm_runs = EXCLUDED.perm_runs, perm_authoring = EXCLUDED.perm_authoring`,
        [username, 서비스id[prefix], 칸.cases, 칸.runs, 칸.authoring],
      );
    }
  }

  // 번호로 부르는 자리를 검사하려면 실제 번호가 있어야 한다. 서비스마다 한 벌씩 만든다
  const 자원 = { 실행: {}, 증적: {}, 입력값묶음: {} } as Record<string, Record<string, number>>;

  async function 자원넣기(prefix: string) {
    const { pool } = await import('../db/index.js');
    const 실행 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_id, service_name, tests_repo, triggered_by, env, base_url, status)
            VALUES ($1, $2, $3, '', 'xfu3-사람', 'qa', 'https://qa.test', 'RUNNING')
         RETURNING run_id`,
      [`${prefix} 문 검사`, 서비스id[prefix], `${prefix} 서비스`],
    );
    자원.실행[prefix] = Number(실행.rows[0]!.run_id);

    const 증적 = await pool.query<{ id: string }>(
      `INSERT INTO evidence_document (run_id, format, status) VALUES ($1, 'PDF', 'READY') RETURNING id`,
      [자원.실행[prefix]],
    );
    자원.증적[prefix] = Number(증적.rows[0]!.id);

    await pool.query(
      `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema)
            VALUES ($1, '문 검사용 케이스', 'x/a.spec.ts', '[]'::jsonb, '[]'::jsonb)
       ON CONFLICT (tc_id) DO UPDATE SET is_active = true`,
      [`${prefix}-001`],
    );
    const 묶음 = await pool.query<{ id: string }>(
      `INSERT INTO param_set (tc_id, name, params, expected)
            VALUES ($1, '문 검사 기본', '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (tc_id, name) DO UPDATE SET params = EXCLUDED.params
         RETURNING id`,
      [`${prefix}-001`],
    );
    자원.입력값묶음[prefix] = Number(묶음.rows[0]!.id);
  }

  // 그 서비스의 자원을 부르는 열두 경로. 접두사를 넣으면 실제 주소가 된다
  function 경로들(prefix: string): { method: 'GET' | 'POST' | 'DELETE'; url: string }[] {
    const 실행 = 자원.실행[prefix];
    return [
      { method: 'GET', url: `/api/runs/${실행}` },
      { method: 'GET', url: `/api/runs/${실행}/items/1` },
      { method: 'GET', url: `/api/screenshots/${실행}/1/0.png` },
      { method: 'POST', url: `/api/runs/${실행}/abort` },
      { method: 'POST', url: `/api/runs/${실행}/evidence` },
      { method: 'GET', url: `/api/evidence/${자원.증적[prefix]}` },
      { method: 'DELETE', url: `/api/param-sets/${자원.입력값묶음[prefix]}` },
      { method: 'GET', url: `/api/cases/${prefix}-001/history` },
      { method: 'GET', url: `/api/cases/${prefix}-001/param-sets` },
      { method: 'POST', url: `/api/cases/${prefix}-001/param-sets` },
      { method: 'GET', url: `/api/catalog/cases/${prefix}-001` },
      { method: 'GET', url: `/api/cases/${prefix}-001/source` },
    ];
  }

  async function 출입증(username: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: '열려라참깨' },
    });
    return res.cookies[0]!.value;
  }

  beforeAll(async () => {
    await 서비스넣기('XFS3A', '문 검사용 가');
    await 서비스넣기('XFS3B', '문 검사용 나');
    await 계정넣기('xfu3-viewer', 'member', { XFS3A: 읽기셋 });
    await 계정넣기('xfu3-operator', 'member', { XFS3A: 쓰기셋 });
    await 계정넣기('xfu3-admin', 'admin', { XFS3A: 쓰기셋 });
    await 계정넣기('xfu3-mixed', 'member', {
      XFS3A: { cases: 'read', runs: 'write', authoring: 'none' },
      XFS3B: { cases: 'none', runs: 'read', authoring: 'none' },
    });
    await 계정넣기('xfu3-caseonly', 'member', { XFS3A: { cases: 'read', runs: 'none', authoring: 'none' } });
    await 계정넣기('xfu3-admin0', 'admin', {});
    await 계정넣기('xfu3-mustchange', 'admin', { XFS3A: 쓰기셋 }, true);
    await 자원넣기('XFS3A');
    await 자원넣기('XFS3B');

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });

    // 문만 검사한다. 뒤에 붙는 실제 갈래 대신 통과 여부만 말하는 자리를 둔다
    await app.register(
      async (scope) => {
        scope.get('/catalog/cases', async (req) => ({ 지나감: true, 누구: req.user?.username }));
        scope.post('/catalog/scan', async () => ({ 지나감: true }));
        scope.post('/runs', async () => ({ 지나감: true }));
        scope.get('/settings/services', async () => ({ 지나감: true }));
        scope.get('/settings/users', async () => ({ 지나감: true }));
        scope.get('/authoring/requests', async () => ({ 지나감: true }));
        scope.post('/settings/services', async () => ({ 지나감: true }));

        // 번호·케이스 번호로 부르는 자리 열둘. 진짜 라우트와 같은 모양으로 둔다 —
        // 문이 경로를 읽어 판정하므로 모양이 다르면 검사가 실제와 다른 것을 본다
        scope.get('/runs/:runId', async () => ({ 지나감: true }));
        scope.get('/runs/:runId/items/:historyId', async () => ({ 지나감: true }));
        scope.get('/screenshots/:runId/:historyId/:seq.png', async () => ({ 지나감: true }));
        scope.post('/runs/:runId/abort', async () => ({ 지나감: true }));
        scope.post('/runs/:runId/evidence', async () => ({ 지나감: true }));
        scope.get('/evidence/:id', async () => ({ 지나감: true }));
        scope.delete('/param-sets/:id', async () => ({ 지나감: true }));
        scope.get('/cases/:tcId/history', async () => ({ 지나감: true }));
        scope.post('/cases/:tcId/test-run', async () => ({ 지나감: true }));
        scope.get('/cases/:tcId/test-run/:trialId', async () => ({ 지나감: true }));
        scope.get('/cases/:tcId/param-sets', async () => ({ 지나감: true }));
        scope.post('/cases/:tcId/param-sets', async () => ({ 지나감: true }));
        scope.get('/catalog/cases/:tcId', async () => ({ 지나감: true }));
        scope.get('/cases/:tcId/source', async () => ({ 지나감: true }));
        scope.get('/runs/last-by-case', async () => ({ 지나감: true }));
        scope.get('/dashboard', async () => ({ 지나감: true }));
        // 라우트표에 **일부러 안 넣은** 자리. 분류 안 된 라우트가 막히는지 보는 데 쓴다
        scope.get('/분류안된것', async () => ({ 지나감: true }));
      },
      { prefix: '/api' },
    );

    app.get('/health', async () => ({ ok: true }));
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xfu3%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xfu3%'`);
    // 자기가 만든 자원만 지운다. 실행 행이 서비스를 가리키므로 서비스보다 먼저 지워야
    // 외래키가 막지 않는다 — 순서를 뒤집으면 service 삭제가 조용히 실패한다
    const 실행들 = Object.values(자원.실행);
    await pool.query(`DELETE FROM evidence_document WHERE run_id = ANY($1)`, [실행들]);
    await pool.query(`DELETE FROM param_set WHERE tc_id LIKE 'XFS3%'`);
    await pool.query(`DELETE FROM test_case WHERE tc_id LIKE 'XFS3%'`);
    await pool.query(`DELETE FROM test_run WHERE run_id = ANY($1)`, [실행들]);
    await pool.query(`DELETE FROM service WHERE prefix LIKE 'XFS3%'`);
    await app.close();
  });

  it('로그인하지 않으면 모든 /api 가 401이다', async () => {
    for (const [method, url] of [
      ['GET', '/api/catalog/cases?service=XFS3A'],
      ['POST', '/api/runs'],
      ['GET', '/api/settings/services'],
      ['GET', '/api/auth/me'],
    ] as const) {
      const res = await app.inject({ method, url });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('로그인 자체와 /health 는 문을 지나지 않는다', async () => {
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    const 로그인 = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'xfu3-viewer', password: '열려라참깨' },
    });
    expect(로그인.statusCode).toBe(200);
  });

  it('보기만 등급은 읽되 바꾸지 못한다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-viewer') };

    const 읽기 = await app.inject({ method: 'GET', url: '/api/catalog/cases?service=XFS3A', cookies: 쿠키 });
    expect(읽기.statusCode).toBe(200);
    expect(읽기.json<{ 누구: string }>().누구).toBe('xfu3-viewer');

    const 실행 = await app.inject({ method: 'POST', url: '/api/runs', cookies: 쿠키, payload: {} });
    expect(실행.statusCode).toBe(403);
    expect(실행.json()).toEqual({ error: 'FORBIDDEN', need: 'runs:write' });
  });

  it('보기만 등급도 로그아웃은 된다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      cookies: { platform_session: await 출입증('xfu3-viewer') },
    });
    expect(res.statusCode).toBe(204);
  });

  it('실행까지 등급은 실행하되 설정은 못 연다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };

    const 스캔 = await app.inject({ method: 'POST', url: '/api/catalog/scan', cookies: 쿠키 });
    expect(스캔.statusCode).toBe(200);

    const 설정읽기 = await app.inject({ method: 'GET', url: '/api/settings/services', cookies: 쿠키 });
    expect(설정읽기.statusCode).toBe(403);
    expect(설정읽기.json()).toEqual({ error: 'FORBIDDEN', need: 'admin' });
  });

  it('운영 등급은 설정을 연다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-admin') };
    expect((await app.inject({ method: 'GET', url: '/api/settings/services', cookies: 쿠키 })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/settings/services', cookies: 쿠키 })).statusCode).toBe(200);
  });

  it('배정받지 않은 서비스는 403이고 404로 감추지 않는다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };
    const res = await app.inject({ method: 'GET', url: '/api/catalog/cases?service=XFS3B', cookies: 쿠키 });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XFS3B' });
  });

  it('실행 요청의 서비스는 tcId 접두사에서 알아낸다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };

    const 내것 = await app.inject({
      method: 'POST',
      url: '/api/runs',
      cookies: 쿠키,
      payload: { items: [{ tcId: 'XFS3A-001' }, { tcId: 'XFS3A-002' }] },
    });
    expect(내것.statusCode).toBe(200);

    const 남의것 = await app.inject({
      method: 'POST',
      url: '/api/runs',
      cookies: 쿠키,
      payload: { items: [{ tcId: 'XFS3A-001' }, { tcId: 'XFS3B-001' }] },
    });
    expect(남의것.statusCode).toBe(403);
    expect(남의것.json()).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XFS3B' });
  });

  it('운영 등급이어도 배정받지 않은 서비스는 열리지 않는다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-admin') };
    const res = await app.inject({ method: 'GET', url: '/api/catalog/cases?service=XFS3B', cookies: 쿠키 });
    expect(res.statusCode).toBe(403);
  });

  it('설정 자리는 서비스에 매이지 않는다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-admin') };
    const res = await app.inject({
      method: 'GET',
      url: '/api/settings/services?service=XFS3B',
      cookies: 쿠키,
    });
    expect(res.statusCode).toBe(200);
  });

  // 열둘을 표로 돌린다. 셋만 단언하면 안 단언한 아홉 중 하나가 새도 검사는 초록이다
  // (계획 검토 BLOCKER 2 · LEARNINGS 「반쪽만 고치고 고쳤다고 적었다」)
  it('배정받지 않은 서비스의 자원은 열두 경로 전부 403이다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };

    for (const { method, url } of 경로들('XFS3B')) {
      const res = await app.inject({ method, url, cookies: 쿠키, payload: {} });
      expect(res.statusCode, `${method} ${url}`).toBe(403);
      expect(res.json(), `${method} ${url}`).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XFS3B' });
    }
  });

  // 판정 갈래가 여럿이면 **먼저 걸린 것으로 끝내면 안 된다.**
  // `?service=` 는 부르는 쪽이 적는 값이고 라우트는 그것을 안 본다 —
  // 자원을 고르는 것은 경로의 번호다. 먼저 걸린 것으로 끝내면 쿼리 한 개로 전부 열린다
  it('내 접두사를 쿼리에 붙여도 남의 자원은 안 열린다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };

    for (const { method, url } of 경로들('XFS3B')) {
      const 붙인것 = `${url}${url.includes('?') ? '&' : '?'}service=XFS3A`;
      const res = await app.inject({ method, url: 붙인것, cookies: 쿠키, payload: {} });
      expect(res.statusCode, `${method} ${붙인것}`).toBe(403);
    }
  });

  it('실행 요청 본문에 남의 접두사가 섞여도 쿼리로 못 가린다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs?service=XFS3A',
      cookies: { platform_session: await 출입증('xfu3-operator') },
      payload: { items: [{ tcId: 'XFS3A-001' }, { tcId: 'XFS3B-001' }] },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XFS3B' });
  });

  it('배정받은 서비스의 자원은 열두 경로 전부 지나간다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };

    for (const { method, url } of 경로들('XFS3A')) {
      const res = await app.inject({ method, url, cookies: 쿠키, payload: {} });
      expect(res.statusCode, `${method} ${url}`).toBe(200);
    }
  });

  // 없는 번호를 403으로 답하면 「없는 것」과 「남의 것」이 뭉개진다.
  // SPEC §7 이 「404로 감추지 않는다」로 정했으므로 라우트가 제 답을 내게 지나보낸다
  it('없는 번호는 문을 지나 라우트로 간다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };
    for (const [method, url] of [
      ['GET', '/api/runs/999999999'],
      ['GET', '/api/evidence/999999999'],
      ['DELETE', '/api/param-sets/999999999'],
    ] as const) {
      const res = await app.inject({ method, url, cookies: 쿠키 });
      expect(res.statusCode, `${method} ${url}`).not.toBe(403);
    }
  });

  // 라우트가 자기 번호 칸을 `Number()` 로 느슨하게 읽는 탓에 문이 글자를 파싱하면
  // 둘이 같은 주소에서 다른 값을 본다. 이제 문은 라우트가 받은 `req.params` 를 쓰고
  // 십진 숫자가 아니면 막는다 — 라우트에 닿기 전에 끊는다 (2026-09-19 실측)
  it('라우트와 다르게 읽힐 번호 모양은 막는다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };
    for (const 번호 of ['1e3', '0x10', '+1', '1.0', '99999999999999999999']) {
      const res = await app.inject({ method: 'GET', url: `/api/runs/${번호}`, cookies: 쿠키 });
      expect(res.statusCode, `/api/runs/${번호}`).toBe(403);
    }
  });

  // ★ `app.inject` 는 주소를 정규화해 버려서 **퍼센트 인코딩 우회를 못 본다.**
  // 그래서 여기만 진짜 소켓으로 건다. 문이 `req.url` 글자를 읽던 동안에는
  // `/api/runs/%35%38%36%37` 이 문을 그냥 지나 라우트에서 5867 로 풀렸다 (2026-09-19 실측)
  it('퍼센트로 감싼 번호도 막는다 — 진짜 소켓으로 건다', async () => {
    await app.listen({ port: 0, host: '127.0.0.1' });
    const 주소 = app.server.address();
    const 포트 = typeof 주소 === 'object' && 주소 !== null ? 주소.port : 0;
    // 로그인도 같은 소켓으로 한다. inject 로 받은 출입증을 손으로 옮기면
    // 값에 든 글자를 다시 감싸야 해서 검사가 딴 데서 넘어진다
    const 로그인 = await fetch(`http://127.0.0.1:${포트}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'xfu3-operator', password: '열려라참깨' }),
    });
    const 쿠키 = (로그인.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    const 남의번호 = 자원.실행.XFS3B!;
    const 감싼것 = String(남의번호)
      .split('')
      .map((c) => `%3${c}`)
      .join('');

    try {
      const 그냥 = await fetch(`http://127.0.0.1:${포트}/api/runs/${남의번호}`, {
        headers: { cookie: 쿠키 },
      });
      expect(그냥.status, '감싸지 않은 것').toBe(403);

      const 감싼 = await fetch(`http://127.0.0.1:${포트}/api/runs/${감싼것}`, {
        headers: { cookie: 쿠키 },
      });
      expect(감싼.status, `/api/runs/${감싼것}`).toBe(403);

      // ★ **번호 칸만 보면 절반이다.** 라우터는 주소 전체를 디코딩한 뒤 라우트를 찾으므로
      // `api` · `settings` 같은 **정적 구간**을 감싸도 문과 라우트가 갈린다.
      // `/%61pi/**` 는 문의 「/api/ 로 시작하나」를 비켜서 **로그인조차 안 거쳤고**,
      // `/api/%73ettings/**` 는 설정 자리 판정을 비켜 운영 API 를 열었다 (2026-09-19 실측)
      for (const 주소 of ['/%61pi/settings/services', '/ap%69/settings/services', '/%61pi/runs/1']) {
        const 쿠키없이 = await fetch(`http://127.0.0.1:${포트}${주소}`);
        expect(쿠키없이.status, `로그인 없이 ${주소}`).toBe(401);
      }

      for (const 주소 of ['/api/%73ettings/services', '/api/settin%67s/services']) {
        const res = await fetch(`http://127.0.0.1:${포트}${주소}`, { headers: { cookie: 쿠키 } });
        expect(res.status, `실행까지 등급이 ${주소}`).toBe(403);
      }
    } finally {
      await app.server.close();
    }
  });

  // 표에 없는 라우트는 「서비스에 안 매인다」가 아니라 「아무도 분류하지 않았다」다.
  // 기본값이 열림이면 새 라우트가 조용히 뚫린다 — 이번 구멍이 그렇게 생겼다.
  // `/api/분류안된것` 은 이 검사용 앱에만 있고 라우트표에 없다
  it('등록은 됐는데 라우트표에 없는 주소는 막는다', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/분류안된것',
      cookies: { platform_session: await 출입증('xfu3-operator') },
    });
    expect(res.statusCode).toBe(403);
  });

  it('변경 강제 중인 계정은 나 · 로그아웃 · 비밀번호 바꾸기만 지난다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-mustchange') };
    expect((await app.inject({ method: 'GET', url: '/api/auth/me', cookies: 쿠키 })).statusCode).toBe(200);
    expect((await app.inject({ method: 'HEAD', url: '/api/auth/me', cookies: 쿠키 })).statusCode).toBe(200);
    // 진짜 라우트가 빈 본문을 400 으로 돌려보낸다. 문이 403 으로 막지 않았다는 것만 본다
    expect((await app.inject({ method: 'POST', url: '/api/auth/password', cookies: 쿠키, payload: {} })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: 쿠키 })).statusCode).toBe(204);
  });

  it('변경 강제 중이면 admin 이어도 나머지는 403 PASSWORD_CHANGE_REQUIRED 다 — 권한 판정보다 먼저', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-mustchange') };
    for (const [method, url] of [
      ['GET', '/api/catalog/cases?service=XFS3A'],
      ['HEAD', '/api/catalog/cases?service=XFS3A'],
      ['GET', '/api/settings/users'],
      ['GET', '/api/catalog/cases?service=XFS3B'],
    ] as const) {
      const res = await app.inject({ method, url, cookies: 쿠키 });
      expect(res.statusCode, `${method} ${url}`).toBe(403);
      if (method !== 'HEAD') expect(res.json(), `${method} ${url}`).toEqual({ error: 'PASSWORD_CHANGE_REQUIRED' });
    }
  });

  it('변경 강제 중인 계정도 에이전트 토큰으로 온 요청은 막지 않는다', async () => {
    const 옛이름 = process.env.AUTHORING_AGENT_USER;
    process.env.AUTHORING_AGENT_USER = 'xfu3-mustchange';
    try {
      const 발급 = await 에이전트토큰만들기('xfu3-mustchange');
      if (typeof 발급 === 'string') throw new Error(`토큰 발급 실패: ${발급}`);
      const res = await app.inject({
        method: 'GET',
        url: '/api/authoring/requests?service=XFS3A',
        headers: { authorization: `Bearer ${발급.토큰}` },
      });
      expect(res.statusCode).toBe(200);
    } finally {
      process.env.AUTHORING_AGENT_USER = 옛이름;
    }
  });

  // 라우트가 아예 없으면 지킬 자원도 없다. 404 를 403 으로 덮으면
  // 「없는 것」과 「막힌 것」이 뭉개져 사람이 주소를 고칠 단서를 잃는다
  it('라우트가 없는 주소는 라우터가 404 를 낸다', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/아무도모르는것',
      cookies: { platform_session: await 출입증('xfu3-operator') },
    });
    expect(res.statusCode).toBe(404);
  });

  // 통합 이전 행은 어느 배정에도 안 든다. 열어 두면 §7 의 금지가 옛 행 앞에서만 비켜 준 꼴이 된다
  it('서비스에 안 매인 옛 실행은 막는다', async () => {
    const { pool } = await import('../db/index.js');
    const 옛것 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status)
            VALUES ('xfu3 통합 이전', '', '', 'xfu3-사람', 'qa', 'https://qa.test', 'FINISHED')
         RETURNING run_id`,
    );
    const 번호 = Number(옛것.rows[0]!.run_id);
    try {
      const res = await app.inject({
        method: 'GET',
        url: `/api/runs/${번호}`,
        cookies: { platform_session: await 출입증('xfu3-operator') },
      });
      expect(res.statusCode).toBe(403);
    } finally {
      await pool.query(`DELETE FROM test_run WHERE run_id = $1`, [번호]);
    }
  });

  // 이건 번호로 부르는 것이 아니라 「전부 주는」 질의라 문에서 못 막는다.
  // 질의 자체가 배정으로 걸러야 한다 — 안 그러면 남의 케이스 번호와 판정이 그대로 나간다
  it('서비스마다 그 서비스의 칸으로 판정한다 — 실행 write 인 A 는 멈추고 read 인 B 는 막힌다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-mixed') };
    const 가 = await app.inject({ method: 'POST', url: `/api/runs/${자원.실행.XFS3A}/abort`, cookies: 쿠키 });
    expect(가.statusCode).toBe(200);
    const 나 = await app.inject({ method: 'POST', url: `/api/runs/${자원.실행.XFS3B}/abort`, cookies: 쿠키 });
    expect(나.statusCode).toBe(403);
    expect(나.json()).toEqual({ error: 'FORBIDDEN', need: 'runs:write' });
  });

  it('케이스 read 인 서비스에서 입력값 묶음 저장은 need cases:write 다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XFS3A-001/param-sets',
      cookies: { platform_session: await 출입증('xfu3-mixed') },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'FORBIDDEN', need: 'cases:write' });
  });

  it('케이스 이력은 실행 결과라 케이스 read 만으로는 안 열린다 — need runs:read', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/cases/XFS3A-001/history',
      cookies: { platform_session: await 출입증('xfu3-caseonly') },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'FORBIDDEN', need: 'runs:read' });
  });

  it('실행 read 만 있는 서비스에서 테스트 실행 시작은 need runs:write 이고 결과 읽기는 지난다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-mixed') };
    const 시작 = await app.inject({ method: 'POST', url: '/api/cases/XFS3B-001/test-run', cookies: 쿠키, payload: {} });
    expect(시작.statusCode).toBe(403);
    expect(시작.json()).toEqual({ error: 'FORBIDDEN', need: 'runs:write' });
    const 읽기 = await app.inject({ method: 'GET', url: '/api/cases/XFS3B-001/test-run/abc', cookies: 쿠키 });
    expect(읽기.statusCode).toBe(200);
  });

  it('실행 칸이 없으면 테스트 실행 결과 읽기도 need runs:read 다', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/cases/XFS3A-001/test-run/abc',
      cookies: { platform_session: await 출입증('xfu3-caseonly') },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'FORBIDDEN', need: 'runs:read' });
  });

  it('배정받지 않은 서비스는 칸보다 먼저 SERVICE_FORBIDDEN 이다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${자원.실행.XFS3B}/abort`,
      cookies: { platform_session: await 출입증('xfu3-viewer') },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XFS3B' });
  });

  it('서비스에 안 매인 스캔은 배정 서비스 중 하나라도 케이스 write 여야 한다', async () => {
    const 된다 = await app.inject({
      method: 'POST',
      url: '/api/catalog/scan',
      cookies: { platform_session: await 출입증('xfu3-operator') },
    });
    expect(된다.statusCode).toBe(200);
    const 안된다 = await app.inject({
      method: 'POST',
      url: '/api/catalog/scan',
      cookies: { platform_session: await 출입증('xfu3-mixed') },
    });
    expect(안된다.statusCode).toBe(403);
    expect(안된다.json()).toEqual({ error: 'FORBIDDEN', need: 'cases:write' });
  });

  it('admin 은 배정 없이 스캔하지만 서비스 자원은 배정된 곳에서만이다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-admin0') };
    expect((await app.inject({ method: 'POST', url: '/api/catalog/scan', cookies: 쿠키 })).statusCode).toBe(200);
    const res = await app.inject({ method: 'GET', url: `/api/runs/${자원.실행.XFS3A}`, cookies: 쿠키 });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XFS3A' });
  });

  it('마지막 결과 일괄 조회가 배정받은 서비스만 준다', async () => {
    const { lastByCase } = await import('../execution/history.js');
    const 낸것 = await lastByCase(['XFS3A']);
    expect(낸것.every((줄) => 줄.tcId.startsWith('XFS3A-'))).toBe(true);
  });

  it('배정이 하나도 없으면 아무것도 안 준다', async () => {
    const { lastByCase } = await import('../execution/history.js');
    expect(await lastByCase([])).toEqual([]);
  });

  it('앱 대시보드는 서비스에 안 매인다 — 배정 중 하나라도 실행 read 면 지나고 없으면 need runs:read 다', async () => {
    const url = '/api/dashboard?tz=Asia%2FSeoul';
    for (const username of ['xfu3-viewer', 'xfu3-mixed', 'xfu3-admin0']) {
      const res = await app.inject({ method: 'GET', url, cookies: { platform_session: await 출입증(username) } });
      expect(res.statusCode, username).toBe(200);
    }
    const 막힘 = await app.inject({ method: 'GET', url, cookies: { platform_session: await 출입증('xfu3-caseonly') } });
    expect(막힘.statusCode).toBe(403);
    expect(막힘.json()).toEqual({ error: 'FORBIDDEN', need: 'runs:read' });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 등급 표 — 2026-09-22 에 자동 규칙에서 갈아탔다 (SPEC 도메인/인증 §7)
//
// **이 절이 없으면 서른여덟 줄을 손으로 옮겨 적다 한 줄 틀려도 아무도 모른다.**
// 틀린 방향 둘이 값이 다르다 — 보기만을 실행으로 적으면 목록을 못 읽어 시끄럽고,
// 실행을 보기만으로 적으면 **보기만 등급이 실행을 거는데 403 이 안 나 아무도 안 빨개진다.**
// ─────────────────────────────────────────────────────────────────────────────
describe('등급 표', () => {
  // 소스에 실제로 등록된 (틀, 메서드) 를 훑는다. scope.test.ts 와 같은 수법이다 —
  // 검사용 가짜 라우트를 훑으면 진짜 라우트가 늘어도 아무 신호가 안 뜬다
  function 소스의쌍들(): string[] {
    const 뿌리 = resolve(dirname(new URL(import.meta.url).pathname), '..');
    const 폴더들 = readdirSync(뿌리, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((이름) => existsSync(join(뿌리, 이름, 'routes.ts')));
    const 등록 =
      /\bapp\.(get|post|patch|put|delete|head|all|options|route)\s*(?:<[\s\S]*?>)?\s*\(\s*[{]?\s*(?:url\s*:\s*)?['"`]([^'"`]+)['"`]/g;
    const 쌍 = new Set<string>();
    // routes.ts 하나만 보면 300줄 때문에 옆 파일로 뗀 플러그인(authoring/assets.ts)이 그물 밖이다 (2026-09-23)
    for (const 폴더 of 폴더들) {
      const 파일들 = readdirSync(join(뿌리, 폴더)).filter(
        (이름) => 이름.endsWith('.ts') && !이름.endsWith('.test.ts'),
      );
      for (const 파일 of 파일들) {
        const 글 = readFileSync(join(뿌리, 폴더, 파일), 'utf8');
        for (const 맞은것 of 글.matchAll(등록)) {
          쌍.add(`${(맞은것[1] ?? '').toUpperCase()} /api${맞은것[2] ?? ''}`);
        }
      }
    }
    return [...쌍].sort();
  }

  it('소스에 등록된 (틀, 메서드) 가 전부 표에 있다', () => {
    const 빠진것 = 소스의쌍들().filter((쌍) => !(쌍 in 등급표));
    expect(
      빠진것,
      `등급 표에 없는 자리: ${빠진것.join(' · ')}\n` +
        '표에 없으면 admin 으로 떨어진다 — 안 적으면 운영 중에야 403 으로 드러난다',
    ).toEqual([]);
  });

  it('표에 있는데 소스에 없는 자리가 없다', () => {
    const 소스 = new Set(소스의쌍들());
    const 유령 = Object.keys(등급표).filter((쌍) => !소스.has(쌍));
    expect(유령, `소스에 없는 자리가 표에 남아 있다: ${유령.join(' · ')}`).toEqual([]);
  });

  // ★ 옛 등급 하나를 서비스별 칸으로 옮긴 뒤 **누구의 할 수 있는 일도 바뀌지 않았나** (SPEC 도메인/인증 §7 「옛 등급에서 옮긴 값」)
  // 일부러 바꾼 자리. 머지는 저장소를 영구히 바꾸는 일이라 admin 으로 올렸다 (SPEC 도메인/인증 §7).
  // 표준 기획서 · 화면 기록 읽기는 GET 이지만 작성 에이전트의 일이라 다른 에이전트 통로처럼 (작성, write) 다 (같은 절 「작성 에이전트가 하는 일」)
  const 일부러 = new Map<string, 옛등급>([
    ['POST /api/authoring/merges', 'admin'],
    ['GET /api/authoring/requests/:id/prd', 'operator'],
    ['GET /api/authoring/requests/:id/screens', 'operator'],
  ]);
  const 옛높이 = { viewer: 0, operator: 1, admin: 2 } as const;
  type 옛등급 = keyof typeof 옛높이;
  const 옛등급들: 옛등급[] = ['viewer', 'operator', 'admin'];

  function 옮긴사람(r: 옛등급, 배정: string[]): { role: 'member' | 'admin'; services: { prefix: string; permissions: 서비스권한 }[] } {
    if (r === 'admin') return { role: 'admin', services: 배정.map((prefix) => ({ prefix, permissions: { ...관리자권한 } })) };
    const 칸 = r === 'viewer' ? 'read' : 'write';
    return {
      role: 'member',
      services: 배정.map((prefix) => ({ prefix, permissions: { cases: 칸, runs: 칸, authoring: 칸 } })),
    };
  }

  // 문이 등급 판정 앞에서 돌려보내는 자리. 옛 규칙의 값이 쓰인 적이 없다
  const 대조할쌍들 = (): { 쌍: string; 메서드: string; 틀: string }[] =>
    소스의쌍들()
      .filter((쌍) => !(쌍.split(' ')[1] ?? '').startsWith('/api/auth/'))
      .map((쌍) => {
        const [메서드 = '', 틀 = ''] = 쌍.split(' ');
        return { 쌍, 메서드, 틀 };
      });
  const 옛것 = (쌍: string, 틀: string, 메서드: string): 옛등급 => 일부러.get(쌍) ?? 옛자동규칙(틀, 메서드);

  it('옛 등급을 옮긴 권한으로 판정해도 통과·거절이 옛 규칙과 같다 — 배정 서비스 하나', () => {
    const 달라진것: string[] = [];
    for (const { 쌍, 메서드, 틀 } of 대조할쌍들()) {
      const 닿는것 = 라우트표[틀]?.종류 === '안매임' ? [] : ['XA'];
      for (const r of 옛등급들) {
        const 옛판정 = 옛높이[r] >= 옛높이[옛것(쌍, 틀, 메서드)];
        const 새판정 = 권한이되나(옮긴사람(r, ['XA']), 필요권한(틀, 메서드), 닿는것);
        if (옛판정 !== 새판정) 달라진것.push(`${쌍} · ${r} — 옛 ${옛판정} · 새 ${새판정}`);
      }
    }
    expect(달라진것, `옮기다 틀린 자리:\n${달라진것.join('\n')}`).toEqual([]);
  });

  // 배정 0건은 「하나라도」 규칙이다 (§7 「서비스를 하나도 뽑지 못한 요청」). admin 만 배정 없이 안매임 일을 한다
  it('배정 0건 — admin 은 안매임 자리에서 옛 규칙과 같고 member 는 아무 칸도 없어 막힌다', () => {
    const 달라진것: string[] = [];
    for (const { 쌍, 메서드, 틀 } of 대조할쌍들().filter(({ 틀 }) => 라우트표[틀]?.종류 === '안매임')) {
      for (const r of 옛등급들) {
        const 기대 = r === 'admin' ? 옛높이.admin >= 옛높이[옛것(쌍, 틀, 메서드)] : false;
        const 새판정 = 권한이되나(옮긴사람(r, []), 필요권한(틀, 메서드), []);
        if (기대 !== 새판정) 달라진것.push(`${쌍} · ${r} — 기대 ${기대} · 새 ${새판정}`);
      }
    }
    expect(달라진것, 달라진것.join('\n')).toEqual([]);
  });

  // 옛 viewer·operator 는 기능 셋을 한꺼번에 가져서 통로를 엉뚱한 기능에 묶어도 위 대조가 초록이다 (계획 BLOCKER 1)
  // 접두사와 다른 기능에 일부러 묶은 자리. 까닭이 없으면 여기 넣지 않는다
  const 접두사예외: Record<string, { 기능: 기능; 까닭: string }> = {
    'GET /api/cases/:tcId/history': { 기능: 'runs', 까닭: '주소는 케이스 아래지만 내용은 실행 결과 이력이다 (execution/routes.ts)' },
    'POST /api/cases/:tcId/test-run': { 기능: 'runs', 까닭: '주소는 케이스 아래지만 브라우저를 돌리는 실행이다 (execution/trialRoutes.ts)' },
    'GET /api/cases/:tcId/test-run/:trialId': { 기능: 'runs', 까닭: '테스트 실행 결과 읽기다 (execution/trialRoutes.ts)' },
    'GET /api/dashboard': { 기능: 'runs', 까닭: '주소에 기능 접두사가 없다. 돌려주는 것이 실행 결과 집계다 (reporting/routes.ts)' },
  };
  it('표의 기능은 경로 접두사가 정한 기능과 같다 — 접두사예외만 빼고', () => {
    const 경로의기능 = (틀: string): 기능 | null => {
      if (/^\/api\/(catalog|cases|param-sets)(\/|$)/.test(틀)) return 'cases';
      if (/^\/api\/(runs|evidence|screenshots|scenarios|scenario-trials)(\/|$)/.test(틀)) return 'runs';
      if (/^\/api\/(authoring|prd)(\/|$)/.test(틀)) return 'authoring';
      return null;
    };
    const 어긋난것: string[] = [];
    for (const [쌍, 값] of Object.entries(등급표)) {
      if (typeof 값 !== 'object') continue;
      const 기대 = 접두사예외[쌍]?.기능 ?? 경로의기능(쌍.split(' ')[1] ?? '');
      if (값.기능 !== 기대) 어긋난것.push(`${쌍} — 표 ${값.기능} · 경로 ${String(기대)}`);
    }
    expect(어긋난것).toEqual([]);
  });

  it('머지는 admin 이고 작성·재실행은 (작성, write) 다 — 둘이 같으면 실행 권한이 저장소를 바꾼다', () => {
    expect(등급표['POST /api/authoring/merges']).toBe('admin');
    expect(등급표['POST /api/authoring/requests']).toEqual({ 기능: 'authoring', 칸: 'write' });
  });

  it('자료 올리기와 줄에 세우기는 (작성, write) 다 — 요청을 넣는 것과 같은 일이다', () => {
    expect(등급표['POST /api/authoring/requests/:id/assets']).toEqual({ 기능: 'authoring', 칸: 'write' });
    expect(등급표['POST /api/authoring/requests/:id/submit']).toEqual({ 기능: 'authoring', 칸: 'write' });
    expect(등급표['POST /api/authoring/requests/:id/outputs']).toEqual({ 기능: 'authoring', 칸: 'write' });
  });

  it('자료 내려받기는 (작성, read) 다 — 상세를 보는 사람이 그 기획서도 본다', () => {
    expect(등급표['GET /api/authoring/requests/:id/assets/:assetId']).toEqual({ 기능: 'authoring', 칸: 'read' });
  });
});

// 시나리오 통로의 문 — 실행 칸 · 번호의 서비스 · 만들기 본문의 service (도메인/시나리오 §7 · 인증 §7)
describe.skipIf(연결 === undefined)('시나리오 문', () => {
  let app: FastifyInstance;
  const 서비스id: Record<string, number> = {};
  const 시나리오: Record<string, number> = {};
  const 실행: Record<string, number> = {};
  const 계정들 = ['xsa-reader', 'xsa-writer'];

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  async function 출입증(username: string): Promise<Record<string, string>> {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    return { platform_session: res.cookies[0]!.value };
  }

  beforeAll(async () => {
    for (const prefix of ['XSA', 'XSA2']) {
      const r = await q(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
              VALUES ($1, $1, '#223344', '', 'xsa')
         ON CONFLICT (prefix) DO UPDATE SET is_active = true
           RETURNING id`,
        [prefix],
      );
      서비스id[prefix] = Number((r.rows[0] as { id: string }).id);
      const s = await q(`INSERT INTO scenario (service_id, name, created_by) VALUES ($1, $2, 'xsa') RETURNING id`, [
        서비스id[prefix],
        `${prefix} 흐름`,
      ]);
      시나리오[prefix] = Number((s.rows[0] as { id: string }).id);
      await q(
        `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name)
         VALUES ($1, 1, 'desktop', '[]', 'xsa', 'xsa')`,
        [시나리오[prefix]],
      );
      const r2 = await q(
        `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url,
                               kind, scenario_id, scenario_version)
         VALUES ($1, 'xsa', 'qa', 'FINISHED', $2, $1, '', '', 'SCENARIO', $3, 1) RETURNING run_id`,
        [`${prefix} 흐름`, 서비스id[prefix], 시나리오[prefix]],
      );
      실행[prefix] = Number((r2.rows[0] as { run_id: string }).run_id);
    }
    const 배정: Record<string, 'read' | 'write'> = { 'xsa-reader': 'read', 'xsa-writer': 'write' };
    for (const [username, runs] of Object.entries(배정)) {
      await q(
        `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
              VALUES ($1, $1, $2, 'member', 'read', true, false)
         ON CONFLICT (username) DO UPDATE SET is_active = true, password_hash = EXCLUDED.password_hash,
                                              must_change_password = false`,
        [username, await 해시('열려라참깨')],
      );
      await q(
        `INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring)
              VALUES ($1, $2, 'read', $3, 'none')
         ON CONFLICT (username, service_id) DO UPDATE SET perm_runs = EXCLUDED.perm_runs`,
        [username, 서비스id.XSA, runs],
      );
    }

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    // 문만 본다. 진짜 라우트와 같은 모양의 자리를 둔다
    await app.register(
      async (scope) => {
        scope.get('/scenarios', async () => ({ 지나감: true }));
        scope.post('/scenarios', async () => ({ 지나감: true }));
        scope.get('/scenarios/case-parts/:tcId', async () => ({ 지나감: true }));
        scope.get('/scenarios/:id', async () => ({ 지나감: true }));
        scope.get('/scenarios/:id/versions/:v', async () => ({ 지나감: true }));
        scope.put('/scenarios/:id', async () => ({ 지나감: true }));
        scope.post('/scenarios/:id/restore', async () => ({ 지나감: true }));
        scope.post('/scenarios/:id/archive', async () => ({ 지나감: true }));
        scope.post('/scenarios/:id/runs', async () => ({ 지나감: true }));
        scope.get('/runs/:runId/scenario', async () => ({ 지나감: true }));
        scope.get('/runs/:runId/scenario/screenshots/:seq', async () => ({ 지나감: true }));
        scope.post('/scenario-trials', async () => ({ 지나감: true }));
        scope.get('/scenario-trials/:trialId', async () => ({ 지나감: true }));
        scope.get('/scenario-trials/:trialId/screenshots/:seq', async () => ({ 지나감: true }));
      },
      { prefix: '/api' },
    );
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await q('DELETE FROM user_service WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    for (const id of Object.values(서비스id)) {
      await q('DELETE FROM test_run WHERE service_id = $1', [id]);
      await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [id]);
      await q('DELETE FROM scenario WHERE service_id = $1', [id]);
      await q('DELETE FROM service WHERE id = $1', [id]);
    }
  });

  it('(실행, read) 만 있으면 보기는 되고 만들기·고치기는 403 이다', async () => {
    const cookies = await 출입증('xsa-reader');
    const 내것 = 시나리오.XSA;
    for (const url of [
      '/api/scenarios?service=XSA',
      `/api/scenarios/${내것}`,
      `/api/scenarios/${내것}/versions/1`,
      '/api/scenarios/case-parts/XSA-001',
      `/api/runs/${실행.XSA}/scenario`,
      `/api/runs/${실행.XSA}/scenario/screenshots/1`,
    ]) {
      expect((await app.inject({ method: 'GET', url, cookies })).statusCode, url).toBe(200);
    }
    for (const 요청 of [
      { method: 'POST', url: '/api/scenarios', payload: { service: 'XSA' } },
      { method: 'PUT', url: `/api/scenarios/${내것}`, payload: {} },
      { method: 'POST', url: `/api/scenarios/${내것}/restore`, payload: {} },
      { method: 'POST', url: `/api/scenarios/${내것}/archive`, payload: {} },
      { method: 'POST', url: `/api/scenarios/${내것}/runs`, payload: { env: 'qa' } },
    ] as const) {
      const res = await app.inject({ ...요청, cookies });
      expect(res.statusCode, 요청.url).toBe(403);
      expect(res.json(), 요청.url).toEqual({ error: 'FORBIDDEN', need: 'runs:write' });
    }
  });

  it('남의 서비스 시나리오 번호는 쓰기 등급이어도 403 이다', async () => {
    const cookies = await 출입증('xsa-writer');
    const 남의것 = 시나리오.XSA2;
    for (const 요청 of [
      { method: 'GET', url: `/api/scenarios/${남의것}` },
      { method: 'GET', url: `/api/scenarios/${남의것}/versions/1` },
      { method: 'PUT', url: `/api/scenarios/${남의것}?service=XSA` },
      { method: 'POST', url: `/api/scenarios/${남의것}/restore` },
      { method: 'POST', url: `/api/scenarios/${남의것}/archive` },
      { method: 'GET', url: '/api/scenarios/case-parts/XSA2-001' },
      { method: 'POST', url: `/api/scenarios/${남의것}/runs` },
      { method: 'GET', url: `/api/runs/${실행.XSA2}/scenario` },
      { method: 'GET', url: `/api/runs/${실행.XSA2}/scenario/screenshots/1` },
    ] as const) {
      const res = await app.inject({ ...요청, cookies, payload: {} });
      expect(res.statusCode, 요청.url).toBe(403);
      expect(res.json(), 요청.url).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XSA2' });
    }
    expect((await app.inject({ method: 'PUT', url: `/api/scenarios/${시나리오.XSA}`, cookies, payload: {} })).statusCode).toBe(200);
  });

  it('만들기 본문의 service 가 배정 밖이면 쿼리로 가려도 403 이다', async () => {
    const cookies = await 출입증('xsa-writer');
    const 만들기 = (url: string, payload: Record<string, unknown>) => app.inject({ method: 'POST', url, cookies, payload });
    expect((await 만들기('/api/scenarios', { service: 'XSA' })).statusCode).toBe(200);
    for (const url of ['/api/scenarios', '/api/scenarios?service=XSA']) {
      const res = await 만들기(url, { service: 'XSA2' });
      expect(res.statusCode, url).toBe(403);
      expect(res.json(), url).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XSA2' });
    }
  });

  it('만들기 본문에 service 가 없거나 접두사 모양이 아니면 막는다', async () => {
    const cookies = await 출입증('xsa-writer');
    for (const payload of [{}, { service: 'xsa' }, { service: 123 }, { service: ['XSA'] }, { service: '' }]) {
      const res = await app.inject({ method: 'POST', url: '/api/scenarios?service=XSA', cookies, payload });
      expect(res.statusCode, JSON.stringify(payload)).toBe(403);
      expect(res.json<{ error: string }>().error).toBe('SERVICE_FORBIDDEN');
    }
  });

  it('시험 실행 시작은 (실행, write) 이고 본문 service 가 배정 밖이면 403 이다', async () => {
    const 읽기 = await 출입증('xsa-reader');
    const 쓰기 = await 출입증('xsa-writer');
    const 시작 = (cookies: Record<string, string>, payload: Record<string, unknown>) =>
      app.inject({ method: 'POST', url: '/api/scenario-trials', cookies, payload });

    expect((await 시작(읽기, { service: 'XSA' })).json()).toEqual({ error: 'FORBIDDEN', need: 'runs:write' });
    expect((await 시작(쓰기, { service: 'XSA' })).statusCode).toBe(200);
    expect((await 시작(쓰기, { service: 'XSA2' })).json()).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XSA2' });
    expect((await 시작(쓰기, {})).statusCode).toBe(403);
  });

  it('시험 결과·사진은 남의 번호 · 없는 번호 · 모양 아닌 번호를 문이 지나보낸다 — 라우트가 404 를 낸다', async () => {
    시나리오시험.전부비운다();
    const 남의것 = 시나리오시험.시작한다('누군가', 'XSA2', () => new Promise(() => {}), []);
    const cookies = await 출입증('xsa-reader');
    for (const 번호 of [남의것, '44444444-4444-4444-8444-444444444444', '모양아님']) {
      for (const url of [`/api/scenario-trials/${번호}`, `/api/scenario-trials/${번호}/screenshots/1`]) {
        expect((await app.inject({ method: 'GET', url, cookies })).statusCode, url).toBe(200);
      }
    }
    시나리오시험.전부비운다();
  });

  it('내 시험이어도 그 서비스 배정이 없으면 403 이다', async () => {
    시나리오시험.전부비운다();
    const 내것 = 시나리오시험.시작한다('xsa-reader', 'XSA2', () => new Promise(() => {}), []);
    const cookies = await 출입증('xsa-reader');
    const res = await app.inject({ method: 'GET', url: `/api/scenario-trials/${내것}`, cookies });
    expect(res.json()).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XSA2' });
    const 내XSA = (시나리오시험.전부비운다(), 시나리오시험.시작한다('xsa-reader', 'XSA', () => new Promise(() => {}), []));
    expect((await app.inject({ method: 'GET', url: `/api/scenario-trials/${내XSA}`, cookies })).statusCode).toBe(200);
    시나리오시험.전부비운다();
  });
});

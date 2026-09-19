// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from './gate.js';
import { 해시 } from './password.js';
import authRoutes from './routes.js';
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

  async function 계정넣기(username: string, role: string, 서비스들: string[]) {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role)
            VALUES ($1, $1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET is_active = true, role = EXCLUDED.role,
                                            password_hash = EXCLUDED.password_hash`,
      [username, await 해시('열려라참깨'), role],
    );
    for (const prefix of 서비스들) {
      await pool.query(
        `INSERT INTO user_service (username, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [username, 서비스id[prefix]],
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
    await 계정넣기('xfu3-viewer', 'viewer', ['XFS3A']);
    await 계정넣기('xfu3-operator', 'operator', ['XFS3A']);
    await 계정넣기('xfu3-admin', 'admin', ['XFS3A']);
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
        scope.get('/cases/:tcId/param-sets', async () => ({ 지나감: true }));
        scope.post('/cases/:tcId/param-sets', async () => ({ 지나감: true }));
        scope.get('/catalog/cases/:tcId', async () => ({ 지나감: true }));
        scope.get('/cases/:tcId/source', async () => ({ 지나감: true }));
        scope.get('/runs/last-by-case', async () => ({ 지나감: true }));
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
    expect(실행.json()).toEqual({ error: 'FORBIDDEN', need: 'operator' });
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
  it('마지막 결과 일괄 조회가 배정받은 서비스만 준다', async () => {
    const { lastByCase } = await import('../execution/history.js');
    const 낸것 = await lastByCase(['XFS3A']);
    expect(낸것.every((줄) => 줄.tcId.startsWith('XFS3A-'))).toBe(true);
  });

  it('배정이 하나도 없으면 아무것도 안 준다', async () => {
    const { lastByCase } = await import('../execution/history.js');
    expect(await lastByCase([])).toEqual([]);
  });

});

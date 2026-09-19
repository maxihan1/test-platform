// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from './gate.js';
import { 분류됐나 } from './scope.js';
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
      { method: 'GET', url: `/api/catalog/cases/${prefix}-001/source` },
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
        scope.get('/catalog/cases/:tcId/source', async () => ({ 지나감: true }));
        scope.get('/runs/last-by-case', async () => ({ 지나감: true }));
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
    for (const url of ['/api/runs/999999999', '/api/evidence/999999999', '/api/param-sets/999999999']) {
      const res = await app.inject({ method: 'GET', url, cookies: 쿠키 });
      expect(res.statusCode, url).not.toBe(403);
    }
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

  // 구멍을 세어서 막으면 다음에 더해진 라우트는 또 안 막힌다 —
  // 이번 구멍이 그렇게 생겼다 (계획 검토 BLOCKER 3)
  it('/api 밑에 분류 안 된 라우트가 없다', () => {
    const 안분류된것 = app
      .printRoutes({ commonPrefix: false })
      .split('\n')
      .map((줄) => 줄.replace(/^[^/]*/, '').replace(/\s.*$/, '').trim())
      .filter((경로) => 경로.startsWith('/api/') || 경로 === '/api')
      .filter((경로) => !분류됐나(경로));

    expect(안분류된것, `분류되지 않은 라우트: ${안분류된것.join(' · ')}`).toEqual([]);
  });
});

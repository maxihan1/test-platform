// API 서버 이름 — 설정 통로(읽기·쓰기)와 케이스 목록의 꼬리표·거르기·칩 건수 (SPEC 도메인/인증 §7 `…/api-servers` · 도메인/카탈로그 §8.1 「API 서버」)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { listCases } from '../catalog/store.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

type 줄 = { host: string; name: string | null; cases: number };

describe.skipIf(연결 === undefined)('API 서버 이름', () => {
  let app: FastifyInstance;
  let pool: Pool;
  const 프로젝트: number[] = [];
  const 서비스: number[] = [];
  // 프론트(XAV) · 백오피스(XAVB)는 같은 프로젝트, XAVC 는 다른 프로젝트
  let 프론트 = 0;
  let 백오피스 = 0;
  let 남의 = 0;
  const 케이스들 = ['XAV-FN-001', 'XAV-FN-002', 'XAV-FN-003', 'XAV-FN-004', 'XAVB-FN-001', 'XAVC-FN-001'];

  const 읽기 = async (id: number) => (await app.inject({ method: 'GET', url: `/api/settings/projects/${id}/api-servers` })).json<{ items: 줄[] }>().items;
  const 쓰기 = (id: number, items: unknown) => app.inject({ method: 'PUT', url: `/api/settings/projects/${id}/api-servers`, payload: { items } });

  async function 서비스만들기(prefix: string, project: number): Promise<number> {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1 || ' 검사용', '#445566', '', $2, $3) RETURNING id`,
      [prefix, prefix.toLowerCase(), project],
    );
    서비스.push(Number(r.rows[0]!.id));
    return Number(r.rows[0]!.id);
  }

  async function 부른다(service: number, method: string, host: string, path: string, 케이스: string[]) {
    const api = await pool.query<{ id: string }>(
      `INSERT INTO service_api (service_id, method, host, path) VALUES ($1, $2, $3, $4) RETURNING id`,
      [service, method, host, path],
    );
    for (const tcId of 케이스) {
      await pool.query(`INSERT INTO service_api_use (api_id, service_id, tc_id, run_id) VALUES ($1, $2, $3, 1)`, [api.rows[0]!.id, service, tcId]);
    }
  }

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    app = Fastify();
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();

    for (const 이름 of ['XAV 프로젝트', 'XAV 다른 프로젝트']) {
      const r = await pool.query<{ id: string }>('INSERT INTO project (name) VALUES ($1) RETURNING id', [이름]);
      프로젝트.push(Number(r.rows[0]!.id));
    }
    프론트 = await 서비스만들기('XAV', 프로젝트[0]!);
    백오피스 = await 서비스만들기('XAVB', 프로젝트[0]!);
    남의 = await 서비스만들기('XAVC', 프로젝트[1]!);
    for (const tcId of 케이스들) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $1, '["desktop"]', '[]', 'xav/' || $1 || '.spec.ts', '{}', '{}')`,
        [tcId],
      );
    }
    // 004 는 꺼진 케이스 — 칩 건수와 설정의 케이스 수에서 빠진다
    await pool.query("UPDATE test_case SET is_active = false WHERE tc_id = 'XAV-FN-004'");

    await 부른다(프론트, 'POST', 'auth.xav.test', '/login', ['XAV-FN-001', 'XAV-FN-002']);
    await 부른다(프론트, 'POST', 'pay.xav.test', '/pay', ['XAV-FN-001', 'XAV-FN-004']);
    await 부른다(프론트, 'GET', 'cdn.xav.test', '/img', ['XAV-FN-003']);
    // 백오피스도 같은 인증 서버를 부른다 — 이름은 프로젝트 것이라 거기에도 붙는다
    await 부른다(백오피스, 'POST', 'auth.xav.test', '/login', ['XAVB-FN-001']);
    // 크롤러가 본 호출은 케이스가 부른 것이 아니다
    await pool.query(
      `INSERT INTO screen_record (service_id, env, state, url, name, text_fp, struct_fp, record, crawled_at)
       VALUES ($1, 'qa', '로그아웃', '/home', '홈', 'a', 'b', '# 기록', now())`,
      [프론트],
    );
    const 화면API = await pool.query<{ id: string }>(
      `INSERT INTO service_api (service_id, method, host, path) VALUES ($1, 'GET', 'crawl.xav.test', '/only-screen') RETURNING id`,
      [프론트],
    );
    await pool.query(
      `INSERT INTO service_api_use (api_id, service_id, env, state, screen_url) VALUES ($1, $2, 'qa', '로그아웃', '/home')`,
      [화면API.rows[0]!.id, 프론트],
    );
    // 다른 프로젝트가 같은 호스트를 부른다 — 이름이 섞이면 안 된다
    await 부른다(남의, 'POST', 'auth.xav.test', '/login', ['XAVC-FN-001']);
  });

  afterAll(async () => {
    const 번호들 = 서비스;
    await pool.query('DELETE FROM service_api WHERE service_id = ANY($1::bigint[])', [번호들]);
    await pool.query('DELETE FROM screen_record WHERE service_id = ANY($1::bigint[])', [번호들]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1::bigint[])', [번호들]);
    await pool.query('DELETE FROM project WHERE id = ANY($1::bigint[])', [프로젝트]);
    await app.close();
  });

  it('읽기 — 케이스가 부른 호스트가 케이스 수와 함께 뜨고 · 이름은 아직 없다 · 크롤러가 본 호스트는 없다', async () => {
    expect(await 읽기(프로젝트[0]!)).toEqual([
      { host: 'auth.xav.test', name: null, cases: 3 },
      { host: 'cdn.xav.test', name: null, cases: 1 },
      { host: 'pay.xav.test', name: null, cases: 1 },
    ]);
  });

  it('없는 프로젝트는 404 · 번호가 글자면 400', async () => {
    const 없음 = await app.inject({ method: 'GET', url: '/api/settings/projects/999999999/api-servers' });
    expect(없음.statusCode).toBe(404);
    expect((await 쓰기(999999999, [{ host: 'a', name: 'b' }])).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/settings/projects/abc/api-servers' })).statusCode).toBe(400);
  });

  it('틀린 모양은 400 이다 — 이름 21자 · 호스트 비어 있음 · items 없음', async () => {
    for (const 나쁜 of [[{ host: 'auth.xav.test', name: '가'.repeat(21) }], [{ host: '  ', name: '인증' }]]) {
      const res = await 쓰기(프로젝트[0]!, 나쁜);
      expect(res.statusCode, JSON.stringify(나쁜)).toBe(400);
      expect(res.json<{ error: string }>().error).toBe('INVALID_REQUEST');
    }
    expect((await app.inject({ method: 'PUT', url: `/api/settings/projects/${프로젝트[0]}/api-servers`, payload: {} })).statusCode).toBe(400);
  });

  it('쓰기 — 이름을 붙이면 읽기에 뜬다. 앞뒤 공백은 떼고 호스트는 소문자로 저장한다. 안 준 호스트는 그대로다', async () => {
    const res = await 쓰기(프로젝트[0]!, [{ host: ' AUTH.xav.test ', name: '  인증 ' }, { host: 'pay.xav.test', name: '결제' }]);
    expect(res.statusCode).toBe(200);
    expect(await 읽기(프로젝트[0]!)).toEqual([
      { host: 'auth.xav.test', name: '인증', cases: 3 },
      { host: 'cdn.xav.test', name: null, cases: 1 },
      { host: 'pay.xav.test', name: '결제', cases: 1 },
    ]);
    await 쓰기(프로젝트[0]!, [{ host: 'pay.xav.test', name: '주문' }]);
    const 다시 = await 읽기(프로젝트[0]!);
    expect(다시.find((x) => x.host === 'pay.xav.test')?.name).toBe('주문');
    expect(다시.find((x) => x.host === 'auth.xav.test')?.name).toBe('인증');
  });

  it('다른 프로젝트에는 안 붙는다', async () => {
    expect(await 읽기(프로젝트[1]!)).toEqual([{ host: 'auth.xav.test', name: null, cases: 1 }]);
  });

  it('목록 — 이름이 붙은 호스트를 실행해서 부른 케이스에 꼬리표가 붙고 · 백오피스 케이스에도 붙는다', async () => {
    await 쓰기(프로젝트[0]!, [{ host: 'pay.xav.test', name: '결제' }]);
    const 앞 = await listCases({ service: 'XAV', q: '', activeOnly: false, page: 1, pageSize: 50 });
    const 꼬리표 = (표: typeof 앞) => Object.fromEntries(표.items.map((c) => [c.tcId, c.apiServers]));
    expect(꼬리표(앞)).toEqual({
      'XAV-FN-001': ['결제', '인증'],
      'XAV-FN-002': ['인증'],
      'XAV-FN-003': [],
      'XAV-FN-004': ['결제'],
    });
    const 뒤 = await listCases({ service: 'XAVB', q: '', activeOnly: true, page: 1, pageSize: 50 });
    expect(꼬리표(뒤)).toEqual({ 'XAVB-FN-001': ['인증'] });
  });

  it('목록 — 거르면 그 이름의 케이스만, 칩 건수는 거르기를 빼고 센다. 꺼진 케이스는 활성만일 때 안 센다', async () => {
    const 인증만 = await listCases({ service: 'XAV', q: '', activeOnly: true, page: 1, pageSize: 50, apiServer: '인증' });
    expect(인증만.items.map((c) => c.tcId)).toEqual(['XAV-FN-001', 'XAV-FN-002']);
    expect(인증만.total).toBe(2);
    expect(인증만.apiServers).toEqual([
      { name: '결제', count: 1 },
      { name: '인증', count: 2 },
    ]);
    const 전체 = await listCases({ service: 'XAV', q: '', activeOnly: false, page: 1, pageSize: 50 });
    expect(전체.apiServers).toEqual([
      { name: '결제', count: 2 },
      { name: '인증', count: 2 },
    ]);
  });

  it('목록 — 모르는 이름은 빈 목록이고 칩 줄은 그대로 낸다', async () => {
    const 없음 = await listCases({ service: 'XAV', q: '', activeOnly: true, page: 1, pageSize: 50, apiServer: '옛이름' });
    expect(없음.items).toEqual([]);
    expect(없음.apiServers.map((x) => x.name)).toEqual(['결제', '인증']);
  });

  it('이름을 비우면 지워지고 꼬리표도 사라진다. 이름이 있으면 케이스가 0건이어도 설정 목록에 남는다', async () => {
    await 쓰기(프로젝트[0]!, [{ host: 'pay.xav.test', name: '' }, { host: 'auth.xav.test', name: '' }]);
    expect((await 읽기(프로젝트[0]!)).map((x) => x.name)).toEqual([null, null, null]);
    const 목록 = await listCases({ service: 'XAV', q: '', activeOnly: true, page: 1, pageSize: 50 });
    expect(목록.apiServers).toEqual([]);
    expect(목록.items.every((c) => c.apiServers.length === 0)).toBe(true);

    await 쓰기(프로젝트[0]!, [{ host: 'gone.xav.test', name: '옛서버' }]);
    expect(await 읽기(프로젝트[0]!)).toContainEqual({ host: 'gone.xav.test', name: '옛서버', cases: 0 });
  });
});

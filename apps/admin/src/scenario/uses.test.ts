// 시나리오 목록의 ?uses= 가 최신 버전에 그 케이스가 든 시나리오만 거르는지 본다 (SPEC 도메인/시나리오 §7)

import type { ScenarioPart } from '@platform/kit';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import scenarioRoutes from './routes.js';
import { 고치기, 만들기 } from './store.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('시나리오 목록 uses 거르기', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 사람 = { username: 'xsn', displayName: '검사 사람' };
  const ids: Record<string, number> = {};

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
  const 기다림: ScenarioPart = { kind: 'wait', ms: 10 };

  const 이름들 = async (uses?: string) => {
    const url = uses === undefined ? '/api/scenarios?service=XSN' : `/api/scenarios?service=XSN&uses=${encodeURIComponent(uses)}`;
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(200);
    return res.json<{ items: { name: string }[] }>().items.map((i) => i.name);
  };

  const 치우기표 = async () => {
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const r = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XSN', 'XSN', '#3A5FCD', '', 'xsn')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number((r.rows[0] as { id: string }).id);
    await 치우기표();

    ids.가 = (await 만들기(서비스, '가', 'desktop', [케이스('XSN-FN-001')], 사람)).id;
    ids.나 = (await 만들기(서비스, '나', 'desktop', [기다림, 케이스('XSN-FN-002')], 사람)).id;
    ids.다 = (await 만들기(서비스, '다', 'desktop', [케이스('XSN-FN-003')], 사람)).id;
    ids.라 = (await 만들기(서비스, '라', 'desktop', [케이스('XSN-FN-001')], 사람)).id;
    await 고치기(ids.라, { name: '라', platform: 'desktop', parts: [케이스('XSN-FN-003')], baseVersion: 1 }, 사람);
    ids.마 = (await 만들기(서비스, '마', 'desktop', [기다림], 사람)).id;

    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 'xsn', displayName: '검사 사람', role: 'admin', dashboard: 'read', mustChangePassword: false, services: [] };
    });
    await app.register(scenarioRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await 치우기표();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('uses 에 든 케이스를 최신 버전 부품에 가진 시나리오만 낸다', async () => {
    expect(await 이름들('XSN-FN-001')).toEqual(['가']);
    expect(await 이름들('XSN-FN-001,XSN-FN-002')).toEqual(['가', '나']);
  });

  it('앞뒤 공백과 빈 조각은 무시한다', async () => {
    expect(await 이름들(' XSN-FN-001 ,,')).toEqual(['가']);
  });

  it('uses 를 두 번 붙여도 500 없이 둘을 합쳐 거른다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/scenarios?service=XSN&uses=XSN-FN-001&uses=XSN-FN-002' });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ items: { name: string }[] }>().items.map((i) => i.name)).toEqual(['가', '나']);
  });

  it('uses 가 없거나 빈 글자면 전부 낸다', async () => {
    const 전부 = ['가', '나', '다', '라', '마'];
    expect(await 이름들()).toEqual(전부);
    expect(await 이름들('')).toEqual(전부);
    expect(await 이름들(' , ')).toEqual(전부);
  });

  it('옛 버전에만 그 케이스가 있으면 안 낸다', async () => {
    expect(await 이름들('XSN-FN-001')).not.toContain('라');
    expect(await 이름들('XSN-FN-003')).toEqual(['다', '라']);
  });

  it('응답 줄에 parts 를 싣지 않는다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/scenarios?service=XSN&uses=XSN-FN-001' });
    const 줄 = res.json<{ items: Record<string, unknown>[] }>().items[0]!;
    expect(줄).not.toHaveProperty('parts');
    expect(줄).toHaveProperty('needsCheck');
  });
});

// E2E 값 연결 제안 — 서비스 지도로 수정 요청 · 값 주입을 미리 채운다 (도메인/시나리오 §3.7 결정 15 「값 연결 제안」 · §7 POST /api/scenarios/link-suggestions)

import type { ScenarioLink, ScenarioPart } from '@platform/kit';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 값연결제안들, type 지도요청 } from './linkSuggest.js';
import scenarioRoutes from './routes.js';

const 케이스 = (tcId: string, 덧: Partial<Extract<ScenarioPart, { kind: 'case' }>> = {}): ScenarioPart => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps: [], ...덧,
});
const 줄 = (method: string, path: string, ...tcIds: string[]): 지도요청 => ({ method, path, cases: tcIds.map((tcId) => ({ tcId })) });

describe('값연결제안들', () => {
  const 지도 = new Map([['MKT', [
    줄('POST', '/api/orders', 'MKT-FN-001', 'MKT-FN-002'),
    줄('PUT', '/api/orders/:n'),
    줄('GET', '/api/orders/:n', 'MKT-FN-003'),
    줄('post', '/api/reviews', 'MKT-FN-002'),
  ]]]);
  const 칸 = new Map([['MKT-FN-003', ['orderId', 'memo']]]);

  it('둘 다 같은 모음에 POST 하고 지도에 그 모음 한 칸 PUT 이 있으면 뒤 단계에 수정 요청을 낸다 — JSON 경로는 비운다', () => {
    expect(값연결제안들([케이스('MKT-FN-001'), 케이스('MKT-FN-002')], 지도, 칸)).toEqual([{
      toSeq: 2,
      link: {
        kind: 'rewrite', method: 'POST', urlPattern: '**/api/orders{,?*}',
        to: { method: 'PUT', path: '/api/orders/{}', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders{,?*}', jsonPath: '' } },
      },
      needs: ['jsonPath'],
      why: '2번이 부른 POST /api/orders 을 PUT /api/orders/{} 로 바꿔 1번이 만든 것을 고칩니다',
    }]);
  });

  it('PUT 이 없으면 PATCH 로, 둘 다 없으면 수정 요청을 안 낸다', () => {
    const 패치 = new Map([['MKT', [줄('POST', '/api/orders', 'MKT-FN-001', 'MKT-FN-002'), 줄('PATCH', '/api/orders/:id')]]]);
    expect(값연결제안들([케이스('MKT-FN-001'), 케이스('MKT-FN-002')], 패치, 칸)[0]?.link).toMatchObject({ to: { method: 'PATCH' } });
    const 없음 = new Map([['MKT', [줄('POST', '/api/orders', 'MKT-FN-001', 'MKT-FN-002')]]]);
    expect(값연결제안들([케이스('MKT-FN-001'), 케이스('MKT-FN-002')], 없음, 칸)).toEqual([]);
  });

  it('앞 단계가 POST 한 모음의 한 칸을 여는 단계에 값 주입을 낸다 — 가장 가까운 앞 단계 · id 로 끝나는 칸 하나', () => {
    const 제안 = 값연결제안들([케이스('MKT-FN-001'), { kind: 'wait', ms: 10 }, 케이스('MKT-FN-002'), 케이스('MKT-FN-003')], 지도, 칸);
    expect(제안.filter((x) => x.link.kind === 'bind')).toEqual([{
      toSeq: 4,
      link: { kind: 'bind', param: 'orderId', value: { fromSeq: 3, method: 'POST', urlPattern: '**/api/orders{,?*}', jsonPath: '' } },
      needs: ['jsonPath'],
      why: '3번이 부른 POST /api/orders 응답의 값을 4번이 여는 /api/orders/{} 에 넣습니다',
    }]);
  });

  it('id 로 끝나는 칸이 없거나 둘 이상이면 칸을 비우고 needs 에 param 을 넣는다 · 입력값 칸이 없으면 안 낸다', () => {
    const 흐름 = [케이스('MKT-FN-001'), 케이스('MKT-FN-003')];
    expect(값연결제안들(흐름, 지도, new Map([['MKT-FN-003', ['memo']]]))[0]).toMatchObject({ link: { param: '' }, needs: ['jsonPath', 'param'] });
    expect(값연결제안들(흐름, 지도, new Map([['MKT-FN-003', ['orderId', '주문번호']]]))[0]).toMatchObject({ link: { param: '' } });
    expect(값연결제안들(흐름, 지도, new Map([['MKT-FN-003', ['isPaid', 'order_id']]]))[0]).toMatchObject({ link: { param: 'order_id' } });
    expect(값연결제안들(흐름, 지도, new Map())).toEqual([]);
  });

  it('같은 종류 · 같은 무늬(값 주입은 같은 칸)의 값 연결이 이미 있거나 로그인 이어받기를 끈 단계에는 안 낸다', () => {
    const 수정: ScenarioLink = {
      kind: 'rewrite', method: 'POST', urlPattern: '**/api/orders{,?*}',
      to: { method: 'PUT', path: '/api/orders/{}', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders{,?*}', jsonPath: 'id' } },
    };
    expect(값연결제안들([케이스('MKT-FN-001'), 케이스('MKT-FN-002', { links: [수정] })], 지도, 칸)).toEqual([]);
    const 주입: ScenarioLink = { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/x', jsonPath: 'id' } };
    expect(값연결제안들([케이스('MKT-FN-001'), 케이스('MKT-FN-003', { links: [주입] })], 지도, 칸)).toEqual([]);
    expect(값연결제안들([케이스('MKT-FN-001'), 케이스('MKT-FN-002', { carryOver: false })], 지도, 칸)).toEqual([]);
    expect(값연결제안들([케이스('MKT-FN-001'), 케이스('MKT-FN-002', { links: [수정] }), 케이스('MKT-FN-003')], 지도, 칸).filter((x) => x.link.kind === 'bind'))
      .toMatchObject([{ toSeq: 3, link: { value: { fromSeq: 1 } } }]);
  });

  it('애플리케이션이 다른 두 단계는 잇지 않고, 지도를 못 받은 애플리케이션은 안 낸다', () => {
    const 섞임 = new Map([...지도, ['MKO', [줄('POST', '/api/orders', 'MKO-FN-001')]]]);
    expect(값연결제안들([케이스('MKO-FN-001'), 케이스('MKT-FN-002')], 섞임, 칸)).toEqual([]);
    expect(값연결제안들([케이스('MKT-FN-001'), 케이스('MKT-FN-002')], new Map(), 칸)).toEqual([]);
  });
});

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XLS';
const 번호들 = ['XLS-FN-001', 'XLS-FN-002'];

describe.skipIf(연결 === undefined)('POST /api/scenarios/link-suggestions', () => {
  let 서비스 = 0;
  let 작성권한: 'none' | 'read' = 'read';
  let app: FastifyInstance;

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<Record<string, unknown>>(sql, 값);
  };
  const 묻기 = async (body: unknown) => {
    const r = await app.inject({ method: 'POST', url: '/api/scenarios/link-suggestions', payload: body as object });
    return { status: r.statusCode, body: r.json() as { items?: { toSeq: number; link: ScenarioLink }[] } };
  };

  beforeAll(async () => {
    const s = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ($1, $2, '#3A5FCD', '', 'xls')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사, `${접두사} 값 연결 제안 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    for (const tc of 번호들) {
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, file_path, param_schema, expected_schema, is_active)
         VALUES ($1, '검사', '["desktop"]', 'xls/a.spec.ts', '{"type":"object","properties":{"orderId":{"type":"string"}}}', '{}', true)
         ON CONFLICT (tc_id) DO UPDATE SET is_active = true`,
        [tc],
      );
    }
    const 부른다 = async (method: string, path: string, tcIds: string[]) => {
      const api = await q('INSERT INTO service_api (service_id, method, host, path) VALUES ($1, $2, $3, $4) RETURNING id', [서비스, method, 'xls.test', path]);
      for (const tcId of tcIds) {
        await q('INSERT INTO service_api_use (api_id, service_id, tc_id, run_id) VALUES ($1, $2, $3, 1)', [api.rows[0]!.id, 서비스, tcId]);
      }
    };
    await 부른다('POST', '/api/orders', ['XLS-FN-001']);
    await 부른다('GET', '/api/orders/:n', ['XLS-FN-002']);

    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = {
        username: 'xls', displayName: '검사 사람',
        services: [{ prefix: 접두사, permissions: { cases: 'read', runs: 'write', authoring: 작성권한 } }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(scenarioRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await q('DELETE FROM service_api WHERE service_id = $1', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  const 초안 = { service: 접두사, parts: [케이스('XLS-FN-001'), 케이스('XLS-FN-002')] };

  it('지도와 입력값 칸으로 값 주입을 낸다 — 조립 거절 400 은 안 건다', async () => {
    작성권한 = 'read';
    const r = await 묻기(초안);
    expect(r.status).toBe(200);
    expect(r.body.items).toEqual([expect.objectContaining({
      toSeq: 2,
      link: { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders{,?*}', jsonPath: '' } },
    })]);
  });

  it('(작성, read) 가 없으면 빈 목록이고, 부품 모양이 틀리면 400 이다', async () => {
    작성권한 = 'none';
    expect(await 묻기(초안)).toEqual({ status: 200, body: { items: [] } });
    expect((await 묻기({ service: 접두사, parts: [{ kind: 'case' }] })).status).toBe(400);
  });

  it('저장 60분 · 크기 상한을 넘는 초안은 지도를 읽지 않고 빈 목록이다', async () => {
    작성권한 = 'read';
    const 큰모킹 = { kind: 'mock', urlPattern: '**/a', status: 200, contentType: 'text/plain', body: 'a'.repeat(100_000) };
    expect(await 묻기({ service: 접두사, parts: [...초안.parts, 큰모킹] })).toEqual({ status: 200, body: { items: [] } });
    const 긴초안 = [...초안.parts, ...Array.from({ length: 11 }, () => 케이스('XLS-FN-002'))];
    expect(await 묻기({ service: 접두사, parts: 긴초안 })).toEqual({ status: 200, body: { items: [] } });
  });
});

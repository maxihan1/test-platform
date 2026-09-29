// 시나리오 API 가 SPEC 도메인/시나리오 §7 의 경로·응답·거절을 지키는지 본다. 문 없이 라우트만 띄운다

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioPart } from '@platform/kit';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import scenarioRoutes from './routes.js';
import { 만들기 } from './store.js';

const 연결 = process.env.DATABASE_URL;

const 소스 = `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'XSR-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('상품을 담는다', async () => {
    await page.getByRole('button').click();
  });
  await test.step('장바구니에 한 건이다', async () => {
    await verify('한 건이다', 1, 1, { blocker: true });
  });
});
`;

describe.skipIf(연결 === undefined)('시나리오 API', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 뿌리 = '';
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 번호들 = ['XSR-001', 'XSR-002'];

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  const 케이스 = (tcId: string, skipSteps: string[] = []): ScenarioPart => ({
    kind: 'case',
    tcId,
    params: {},
    expected: {},
    skipSteps,
  });

  const 만들기요청 = (본문: Record<string, unknown>) =>
    app.inject({
      method: 'POST',
      url: '/api/scenarios',
      payload: { service: 'XSR', name: 'XSR 흐름', platform: 'desktop', parts: [케이스('XSR-001')], ...본문 },
    });

  const 치우기표 = async () => {
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xsr-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xsr'));
    await writeFile(join(뿌리, 'xsr', 'a.spec.ts'), 소스);

    const r = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XSR', 'XSR', '#3A5FCD', '', 'xsr')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number((r.rows[0] as { id: string }).id);
    await 치우기표();
    for (const tcId of 번호들) {
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active)
         VALUES ($1, $1 || ' 이름', '["desktop"]', '[]', 'xsr/a.spec.ts', '{}', '{}', true)
         ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = true`,
        [tcId],
      );
    }

    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 'xsr', displayName: '검사 사람', role: 'admin', dashboard: 'read', mustChangePassword: false, services: [] };
    });
    await app.register(scenarioRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await 치우기표();
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
    if (원래뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 원래뿌리;
  });

  it('만들면 201 과 버전 1 이고 상세에 서비스·이력·점검이 있다', async () => {
    const res = await 만들기요청({ parts: [케이스('XSR-001', ['상품을 담는다'])] });
    expect(res.statusCode).toBe(201);
    const { id, version } = res.json<{ id: number; version: number }>();
    expect(version).toBe(1);

    const 상세 = await app.inject({ method: 'GET', url: `/api/scenarios/${id}` });
    expect(상세.statusCode).toBe(200);
    expect(상세.json()).toMatchObject({
      id,
      service: 'XSR',
      name: 'XSR 흐름',
      platform: 'desktop',
      version: 1,
      parts: [케이스('XSR-001', ['상품을 담는다'])],
      isActive: true,
      versions: [{ version: 1, savedBy: 'xsr', savedByName: '검사 사람' }],
      checks: [],
    });
  });

  it('거절할 조립은 400 INVALID_REQUEST 와 사람 말 사유다', async () => {
    for (const parts of [
      [],
      [케이스('XSR-001', ['장바구니에 한 건이다'])],
      [케이스('XSS-001')],
      [{ kind: 'sleep', ms: 1 }],
      [{ kind: 'unmock', urlPattern: '**' }],
    ]) {
      const res = await 만들기요청({ parts });
      expect(res.statusCode, JSON.stringify(parts)).toBe(400);
      expect(res.json<{ error: string }>().error).toBe('INVALID_REQUEST');
      expect(typeof res.json<{ detail: unknown }>().detail).toBe('string');
    }
  });

  it('이름은 앞뒤 공백을 떼고 1~100자다 · 모르는 서비스는 400 이다', async () => {
    expect((await 만들기요청({ name: '   ' })).statusCode).toBe(400);
    expect((await 만들기요청({ name: 'x'.repeat(101) })).statusCode).toBe(400);
    expect((await 만들기요청({ service: 'XSRNONE' })).statusCode).toBe(400);
    const 뗀것 = await 만들기요청({ name: '  XSR 공백  ' });
    const 본것 = await app.inject({ method: 'GET', url: `/api/scenarios/${뗀것.json<{ id: number }>().id}` });
    expect(본것.json<{ name: string }>().name).toBe('XSR 공백');
  });

  it('번호가 숫자 글자가 아니면 400 이고 없는 번호는 404 다', async () => {
    const 통로들 = (id: string) =>
      [
        { method: 'GET', url: `/api/scenarios/${id}` },
        { method: 'GET', url: `/api/scenarios/${id}/versions/1` },
        { method: 'PUT', url: `/api/scenarios/${id}`, payload: { name: 'a', platform: 'desktop', parts: [케이스('XSR-001')], baseVersion: 1 } },
        { method: 'POST', url: `/api/scenarios/${id}/restore`, payload: { version: 1 } },
        { method: 'POST', url: `/api/scenarios/${id}/archive` },
      ] as const;
    for (const 요청 of 통로들('1e3')) expect((await app.inject(요청)).statusCode, 요청.url).toBe(400);
    for (const 요청 of 통로들('999999999')) expect((await app.inject(요청)).statusCode, 요청.url).toBe(404);
  });

  it('옛 버전을 읽는다 — 버전 번호가 이상하면 400 · 없으면 404', async () => {
    const { id } = (await 만들기요청({ platform: 'desktop' })).json<{ id: number }>();
    const res = await app.inject({ method: 'GET', url: `/api/scenarios/${id}/versions/1` });
    expect(res.json()).toEqual({ platform: 'desktop', parts: [케이스('XSR-001')] });
    expect((await app.inject({ method: 'GET', url: `/api/scenarios/${id}/versions/0` })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: `/api/scenarios/${id}/versions/7` })).statusCode).toBe(404);
  });

  it('고치기는 조립 검사를 다 걸고 늦은 저장은 409 STALE_VERSION 이다', async () => {
    const { id } = (await 만들기요청({})).json<{ id: number }>();
    const 고침 = (본문: Record<string, unknown>) =>
      app.inject({
        method: 'PUT',
        url: `/api/scenarios/${id}`,
        payload: { name: 'XSR 고침', platform: 'desktop', parts: [케이스('XSR-001')], baseVersion: 1, ...본문 },
      });
    expect((await 고침({ parts: [] })).statusCode).toBe(400);
    const 됨 = await 고침({});
    expect(됨.statusCode).toBe(200);
    expect(됨.json()).toEqual({ version: 2 });
    const 늦음 = await 고침({});
    expect(늦음.statusCode).toBe(409);
    expect(늦음.json()).toEqual({ error: 'STALE_VERSION', latest: 2 });
  });

  it('되돌리기는 모양만 본다 — 케이스가 비활성이 돼도 되고 점검이 드러낸다', async () => {
    const { id } = (await 만들기요청({ parts: [케이스('XSR-002')] })).json<{ id: number }>();
    await q(`UPDATE test_case SET is_active = false WHERE tc_id = 'XSR-002'`);
    try {
      expect((await app.inject({ method: 'POST', url: `/api/scenarios/${id}/restore`, payload: { version: '1' } })).statusCode).toBe(400);
      expect((await app.inject({ method: 'POST', url: `/api/scenarios/${id}/restore`, payload: { version: 5 } })).statusCode).toBe(404);
      const 됨 = await app.inject({ method: 'POST', url: `/api/scenarios/${id}/restore`, payload: { version: 1 } });
      expect(됨.json()).toEqual({ version: 2 });
      const 상세 = await app.inject({ method: 'GET', url: `/api/scenarios/${id}` });
      expect(상세.json<{ checks: unknown }>().checks).toEqual([{ seq: 1, reason: 'CASE_INACTIVE' }]);

      const 목록 = await app.inject({ method: 'GET', url: '/api/scenarios?service=XSR' });
      const 줄 = 목록.json<{ items: Record<string, unknown>[] }>().items.find((s) => s.id === id);
      expect(줄).toEqual({
        id,
        name: 'XSR 흐름',
        platform: 'desktop',
        version: 2,
        partCount: 1,
        isActive: true,
        needsCheck: true,
        runnable: false,
        lastRun: null,
      });
    } finally {
      await q(`UPDATE test_case SET is_active = true WHERE tc_id = 'XSR-002'`);
    }
  });

  it('건너뛸 제목이 사라진 저장본은 상세 점검에 STEP_GONE 이다', async () => {
    const { id } = await 만들기(서비스, 'XSR 옛 조립', 'desktop', [케이스('XSR-001', ['사라진 절차'])], {
      username: 'xsr',
      displayName: '검사 사람',
    });
    const 상세 = await app.inject({ method: 'GET', url: `/api/scenarios/${id}` });
    expect(상세.json<{ checks: unknown }>().checks).toEqual([{ seq: 1, reason: 'STEP_GONE' }]);
  });

  it('치우면 204 이고 목록에서 빠진다', async () => {
    const { id } = (await 만들기요청({})).json<{ id: number }>();
    expect((await app.inject({ method: 'POST', url: `/api/scenarios/${id}/archive` })).statusCode).toBe(204);
    const 목록 = await app.inject({ method: 'GET', url: '/api/scenarios?service=XSR' });
    expect(목록.json<{ items: { id: number }[] }>().items.map((s) => s.id)).not.toContain(id);
  });

  const 버전수 = async (id: number) =>
    Number((await q('SELECT count(*) AS n FROM scenario_version WHERE scenario_id = $1', [id])).rows[0].n);
  const 고치기와되돌리기 = (id: number) =>
    [
      { method: 'PUT', url: `/api/scenarios/${id}`, payload: { name: 'XSR 고침', platform: 'desktop', parts: [케이스('XSR-001')], baseVersion: 1 } },
      { method: 'POST', url: `/api/scenarios/${id}/restore`, payload: { version: 1 } },
    ] as const;

  it('치운 시나리오의 고치기·되돌리기는 409 SCENARIO_ARCHIVED 이고 새 버전이 안 생긴다', async () => {
    const { id } = (await 만들기요청({})).json<{ id: number }>();
    await app.inject({ method: 'POST', url: `/api/scenarios/${id}/archive` });
    for (const 요청 of 고치기와되돌리기(id)) {
      const res = await app.inject(요청);
      expect(res.statusCode, 요청.url).toBe(409);
      expect(res.json<{ error: string }>().error).toBe('SCENARIO_ARCHIVED');
      expect(typeof res.json<{ detail: unknown }>().detail).toBe('string');
    }
    expect(await 버전수(id)).toBe(1);
  });

  it('비활성 서비스의 고치기·되돌리기는 400 INVALID_REQUEST 이고 새 버전이 안 생긴다', async () => {
    const { id } = (await 만들기요청({})).json<{ id: number }>();
    await q('UPDATE service SET is_active = false WHERE id = $1', [서비스]);
    try {
      for (const 요청 of 고치기와되돌리기(id)) {
        const res = await app.inject(요청);
        expect(res.statusCode, 요청.url).toBe(400);
        expect(res.json()).toEqual({ error: 'INVALID_REQUEST', detail: '모르는 서비스다: XSR' });
      }
      expect(await 버전수(id)).toBe(1);
    } finally {
      await q('UPDATE service SET is_active = true WHERE id = $1', [서비스]);
    }
  });

  it('목록은 service 가 없으면 400 SERVICE_REQUIRED 다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/scenarios' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'SERVICE_REQUIRED' });
  });

  it('case-parts 는 부품 재료를 주고 없는 케이스는 404 다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/scenarios/case-parts/XSR-001' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      tcId: 'XSR-001',
      steps: [
        { title: '상품을 담는다', skippable: true },
        { title: '장바구니에 한 건이다', skippable: false },
      ],
      r16: true,
      usesRequest: false,
    });
    expect((await app.inject({ method: 'GET', url: '/api/scenarios/case-parts/XSR-999' })).statusCode).toBe(404);
  });
});

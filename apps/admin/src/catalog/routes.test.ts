// 카탈로그 API 5종이 SPEC §7의 경로와 응답 형태를 지키는지 검사한다.
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import catalogRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('카탈로그 API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // 스캔은 서비스마다 자기 폴더만 훑는다 (SPEC §9.2). 데모 케이스를 훑으려면 그 서비스가 있어야 한다
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('DEMO', '데모', '#888888', 'https://example.com/demo', 'demo')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true, tests_dir = 'demo'`,
    );

    app = Fastify();
    await app.register(catalogRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    const { pool } = await import('../db/index.js');
    await pool.end();
  });

  it('POST /api/catalog/scan — 데모 10건을 훑고 결과를 돌려준다', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/catalog/scan' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.added + body.updated).toBe(10);
    expect(body.duplicates).toEqual([]);
    expect(body.error).toBeUndefined();
  });

  it('GET /api/catalog/scan — 마지막 스캔 결과가 남아 있다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/scan' })).json();
    expect(typeof body.scannedAt).toBe('string');
    expect(body.duplicates).toEqual([]);
  });

  it('GET /api/catalog/cases — 활성 케이스를 tcId 순으로 돌려준다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/cases?service=DEMO' })).json();
    expect(body.total).toBeGreaterThanOrEqual(10);
    expect(body.items.map((i: { tcId: string }) => i.tcId)).toContain('DEMO-001');
    expect(body.items[0].tcId <= body.items[1].tcId).toBe(true);
  });

  it('GET /api/catalog/cases — 응답이 순서와 총건수의 성질을 같이 알려준다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/cases?service=DEMO' })).json();
    expect(body.sort).toBe('tcId');
    expect(body.totalIsExact).toBe(true);
    expect(body.page).toBe(1);
    expect(typeof body.pageSize).toBe('number');
  });

  it('GET /api/catalog/cases — service를 안 주면 400이다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/catalog/cases' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('SERVICE_REQUIRED');
  });

  it('GET /api/catalog/cases — 배정받지 않은 서비스는 403이다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/catalog/cases?service=NOPE' });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('SERVICE_FORBIDDEN');
  });

  it('GET /api/catalog/cases — 그 서비스의 케이스만 돌려준다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/cases?service=DEMO' })).json();
    for (const item of body.items) {
      expect(item.tcId.startsWith('DEMO-')).toBe(true);
    }
  });

  it('GET /api/catalog/cases?platform= — 그 디바이스를 지원하는 케이스만 남긴다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/cases?service=DEMO&platform=mobile' })).json();
    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      expect(item.platforms).toContain('mobile');
    }
    expect(body.items.length).toBeLessThan(10);
  });

  it('GET /api/catalog/cases?active=false — 비활성까지 전부 본다', async () => {
    const 활성만 = (await app.inject({ method: 'GET', url: '/api/catalog/cases?service=DEMO' })).json();
    const 전체 = (await app.inject({ method: 'GET', url: '/api/catalog/cases?service=DEMO&active=false' })).json();
    expect(전체.total).toBeGreaterThanOrEqual(활성만.total);
  });

  it('GET /api/catalog/cases?q= — tcId 부분 일치로 찾는다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/cases?service=DEMO&q=DEMO-004' })).json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].tcId).toBe('DEMO-004');
  });

  it('GET /api/catalog/cases?q= — 이름 부분 일치로도 찾는다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/cases?service=DEMO&q=자원' })).json();
    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      expect(`${item.tcId} ${item.name}`).toContain('자원');
    }
  });

  it('GET /api/catalog/cases?q= — 밑줄은 아무 글자나 맞는 기호가 아니라 글자 그대로다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/cases?service=DEMO&q=DEMO_004' })).json();
    expect(body.items).toHaveLength(0);
  });

  it('GET /api/catalog/cases/:tcId — 스키마까지 함께 돌려준다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/cases/DEMO-004' })).json();
    expect(body.tcId).toBe('DEMO-004');
    expect(body.paramSchema.properties.resource.description).toBe('조회할 자원');
    expect(body.platforms).toEqual(['desktop']);
  });

  it('GET /api/catalog/cases/:tcId — 없는 케이스는 404다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/catalog/cases/NOPE-001' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/cases/:tcId/source?line= — 그 줄 둘레를 ±5줄로 돌려준다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/cases/DEMO-001/source?line=12' })).json();
    expect(body.focus).toBe(12);
    expect(body.lines[0].no).toBe(7);
    expect(body.lines.at(-1).no).toBe(17);
    expect(body.lines.some((l: { text: string }) => l.text.includes('test.step'))).toBe(true);
  });

  it('GET /api/cases/:tcId/source — 없는 케이스는 404다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/cases/NOPE-001/source' });
    expect(res.statusCode).toBe(404);
  });
});

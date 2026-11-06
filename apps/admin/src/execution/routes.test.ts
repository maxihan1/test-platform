// 실행 API가 SPEC §7의 경로와 응답 형태를 지키는지 본다.
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Pool } from 'pg';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 항목폰화면, 항목화면을닫는다, 항목화면을연다 } from './live.js';
import executionRoutes from './routes.js';

// 라우트 등록이 띄우는 재기동 복구가 이 파일이 만든 RUNNING 실행까지 닫아, 진행 조회의 남은 시간이 그 경주에 따라 null · 0 으로 갈렸다(4번 중 3번 실패).
// 복구는 store.test.ts · kind.test.ts 가 본다
vi.mock('./store.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./store.js')>()),
  recoverRunning: vi.fn(async () => 0),
}));

const 연결 = process.env.DATABASE_URL;

const 케이스 = `
  INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (tc_id) DO UPDATE SET param_schema = EXCLUDED.param_schema, expected_schema = EXCLUDED.expected_schema`;

const 입력스키마 = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, description: '글 제목' },
    userId: { type: 'number', default: 7, description: '작성자 번호' },
  },
  required: ['title'],
};

const 기대스키마 = {
  type: 'object',
  properties: { statusCode: { type: 'number', default: 201, description: '응답 코드' } },
};

describe.skipIf(연결 === undefined)('진행 조회', () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 가짜러너: FastifyInstance;
  let 내실행 = 0;
  let 남의실행 = 0;
  let 내항목 = 0;
  let 남의항목 = 0;
  const 러너장면 = new Map<string, Buffer>();

  async function 실행만든다(title: string): Promise<number> {
    const row = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status)
            VALUES ($1, '', '', 'XBR-사람', 'qa', 'https://qa.example.com', 'RUNNING')
         RETURNING run_id`,
      [title],
    );
    return Number(row.rows[0]!.run_id);
  }

  async function 항목넣는다(runId: number, tcId: string, timeoutMs: number): Promise<number> {
    const row = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema, status)
            VALUES ($1, $2, 'desktop', 1, $3, $4, $5, '[]', '{}', '{}', '{}', '{}', 'NA')
         RETURNING history_id`,
      [runId, tcId, `${tcId} 케이스`, `demo/${tcId}.spec.ts`, timeoutMs],
    );
    return Number(row.rows[0]!.history_id);
  }

  async function 지운다(): Promise<void> {
    await pool.query(
      "DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XBR 진행%')",
    );
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XBR 진행%'");
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 지운다();

    내실행 = await 실행만든다('XBR 진행 내 실행');
    남의실행 = await 실행만든다('XBR 진행 남의 실행');
    내항목 = await 항목넣는다(내실행, 'XBR-010', 7000);
    남의항목 = await 항목넣는다(남의실행, 'XBR-011', 5000);

    가짜러너 = Fastify();
    가짜러너.get('/progress', async () => ({
      items: [
        { historyId: 내항목, seq: 2, title: '로그인한다', elapsedMs: 1200 },
        { historyId: 남의항목, seq: 1, title: '결제한다', elapsedMs: 800 },
      ],
      // E2E 시나리오 자식 — 남의 실행 것은 응답에 안 나온다
      scenarios: [
        { runId: 내실행, seq: 3, elapsedMs: 4000 },
        { runId: 남의실행, seq: 5, elapsedMs: 9000 },
        { runId: null, trialId: 'x', seq: 1, elapsedMs: 1 },
      ],
    }));
    // 러너가 쥔 장면 — 열쇠마다 한 장. 없는 열쇠는 러너처럼 404 다
    가짜러너.get<{ Params: { key: string } }>('/live/:key', async (req, reply) => {
      const 장 = 러너장면.get(req.params.key);
      return 장 === undefined ? reply.code(404).send({}) : reply.type('image/jpeg').send(장);
    });
    await 가짜러너.listen({ port: 0, host: '127.0.0.1' });
    const addr = 가짜러너.server.address();
    process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;

    app = Fastify();
    await app.register(executionRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await 가짜러너.close();
    delete process.env.RUNNER_URL;
    await 지운다();
    await pool.end();
  });

  it('러너가 다른 실행의 항목을 함께 돌려줘도 그것은 응답에 안 나온다', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/runs/${내실행}/progress` });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.items.map((i: { historyId: number }) => i.historyId)).toEqual([내항목]);
    expect(JSON.stringify(body)).not.toContain('결제한다');
    expect(body.remainingMs).toBeNull();
  });

  it('E2E 실행이면 러너가 알린 그 실행의 지금 부품 번호 · 경과를 step 으로 싣는다', async () => {
    const body = (await app.inject({ method: 'GET', url: `/api/runs/${내실행}/progress` })).json();
    expect(body.step).toEqual({ seq: 3, elapsedMs: 4000 });
  });

  it('응답에 그 항목의 timeoutMs 가 실린다', async () => {
    const body = (await app.inject({ method: 'GET', url: `/api/runs/${내실행}/progress` })).json();
    expect(body.items[0]).toEqual({
      historyId: 내항목,
      seq: 2,
      title: '로그인한다',
      elapsedMs: 1200,
      timeoutMs: 7000,
      live: false,
    });
  });

  it('도는 항목의 장면 열쇠 · 잡은 폰 링크가 메모리에 있으면 live · vision 이 실린다 — 열쇠는 밖에 안 나간다', async () => {
    const 열쇠 = 항목화면을연다(내항목, true)!;
    항목폰화면(내항목, 'https://vision.example.com/#phone=s1');
    try {
      const body = (await app.inject({ method: 'GET', url: `/api/runs/${내실행}/progress` })).json();
      expect(body.items[0]).toMatchObject({ historyId: 내항목, live: true, vision: { url: 'https://vision.example.com/#phone=s1' } });
      expect(JSON.stringify(body)).not.toContain(열쇠);
    } finally {
      항목화면을닫는다(내항목);
    }
  });

  it('러너에 보냈고 러너가 아직 첫 단계를 안 알린 항목도 싣는다 — 단계 칸 없이 · 항목 경과와 함께 (점검표 B2 · B13)', async () => {
    const 보낸항목 = await 항목넣는다(내실행, 'XBR-012', 9000);
    const 남의보낸항목 = await 항목넣는다(남의실행, 'XBR-013', 9000);
    항목화면을연다(보낸항목, true, { runId: 내실행, timeoutMs: 9000 });
    항목폰화면(보낸항목, 'https://vision.example.com/#phone=s9');
    항목화면을연다(남의보낸항목, true, { runId: 남의실행, timeoutMs: 9000 });
    항목화면을연다(내항목, true, { runId: 내실행, timeoutMs: 7000 });
    try {
      const body = (await app.inject({ method: 'GET', url: `/api/runs/${내실행}/progress` })).json();
      expect(body.items.map((i: { historyId: number }) => i.historyId)).toEqual([내항목, 보낸항목]);
      const 아직 = body.items[1];
      expect(아직).toMatchObject({ historyId: 보낸항목, timeoutMs: 9000, live: true, vision: { url: 'https://vision.example.com/#phone=s9' } });
      expect(아직).not.toHaveProperty('seq');
      expect(아직.itemElapsedMs).toBeGreaterThanOrEqual(0);
      expect(body.items[0]).toMatchObject({ historyId: 내항목, seq: 2, elapsedMs: 1200 });
      expect(body.items[0].itemElapsedMs).toBeGreaterThanOrEqual(0);
    } finally {
      for (const 번호 of [보낸항목, 남의보낸항목, 내항목]) 항목화면을닫는다(번호);
    }
  });

  it('항목 장면 — 첫 장면 전 204, 장면이 있으면 JPEG, 그 실행의 항목이 아니거나 끝난 항목은 404 다', async () => {
    const 장면 = (runId: number, historyId: number) => app.inject({ method: 'GET', url: `/api/runs/${runId}/items/${historyId}/live` });
    const 열쇠 = 항목화면을연다(내항목, true)!;
    try {
      expect((await 장면(내실행, 내항목)).statusCode).toBe(204);
      러너장면.set(열쇠, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
      const 한장 = await 장면(내실행, 내항목);
      expect(한장.statusCode).toBe(200);
      expect(한장.headers['content-type']).toBe('image/jpeg');
      expect(한장.headers['cache-control']).toBe('no-store');
      expect([...한장.rawPayload]).toEqual([0xff, 0xd8, 0xff, 0xd9]);
      expect((await 장면(남의실행, 내항목)).json()).toEqual({ error: 'LIVE_NOT_FOUND', detail: String(내항목) });
    } finally {
      항목화면을닫는다(내항목);
      러너장면.clear();
    }
    expect((await 장면(내실행, 내항목)).statusCode).toBe(404);
    // 장면을 안 찍는 항목(android · API 애플리케이션)도 404 다
    항목화면을연다(내항목, false);
    try {
      expect((await 장면(내실행, 내항목)).statusCode).toBe(404);
    } finally {
      항목화면을닫는다(내항목);
    }
  });

  it('android 케이스를 디바이스 팜(DEVICE_FARM_URL) 없이 실행하면 409 FARM_OFF 이고 test_run 이 안 생긴다', async () => {
    const 세기 = "SELECT count(*)::int AS n FROM test_run WHERE service_id = (SELECT id FROM service WHERE prefix = 'XBR')";
    const 앞 = (await pool.query<{ n: number }>(세기)).rows[0]!.n;
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: {
        title: 'XBR 진행 위치 거절',
        env: 'qa',
        items: [{ tcId: 'XBR-010', platforms: ['android'] }],
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('FARM_OFF');
    expect((await pool.query<{ n: number }>(세기)).rows[0]!.n).toBe(앞);
  });
});

describe.skipIf(연결 === undefined)('ParamSet API', () => {
  let app: FastifyInstance;
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await pool.query("DELETE FROM param_set WHERE tc_id LIKE 'XBR%'");
    await pool.query(케이스, [
      'XBR-002',
      '입력값이 있는 케이스',
      JSON.stringify(['desktop']),
      JSON.stringify([]),
      'demo/XBR-002.spec.ts',
      JSON.stringify(입력스키마),
      JSON.stringify(기대스키마),
    ]);

    app = Fastify();
    await app.register(executionRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM param_set WHERE tc_id LIKE 'XBR%'");
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'XBR%'");
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('POST /api/cases/:tcId/param-sets — 스키마에 맞으면 저장한다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-002/param-sets',
      payload: { name: '기본값 묶음', params: { title: '제목', userId: 3 }, expected: { statusCode: 201 } },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(typeof body.id).toBe('number');
    expect(body.name).toBe('기본값 묶음');
    expect(body.params).toEqual({ title: '제목', userId: 3 });
  });

  it('GET /api/cases/:tcId/param-sets — 저장한 묶음이 목록에 나온다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/cases/XBR-002/param-sets' })).json();
    expect(body.items.map((i: { name: string }) => i.name)).toContain('기본값 묶음');
  });

  it('입력값이 스키마와 어긋나면 400과 칸별 사유를 돌려준다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-002/param-sets',
      payload: { name: '어긋난 묶음', params: { title: '', userId: '셋' }, expected: {} },
    });
    expect(res.statusCode).toBe(400);

    const body = res.json();
    expect(body.error).toBe('INVALID_PARAMS');
    expect(body.violations.map((v: { path: string }) => v.path).sort()).toEqual(['title', 'userId']);
    expect(body.violations[0].message).toContain('글 제목');
  });

  it('기대값도 expected_schema로 검증한다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-002/param-sets',
      payload: { name: '기대값이 어긋난 묶음', params: { title: '제목' }, expected: { statusCode: '이백일' } },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().violations[0].path).toBe('statusCode');
  });

  it('반드시 채워야 하는 칸이 비면 저장하지 않는다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-002/param-sets',
      payload: { name: '빈 묶음', params: {}, expected: {} },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().violations[0].path).toBe('title');
  });

  it('같은 이름으로 또 저장하면 409로 거절한다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-002/param-sets',
      payload: { name: '기본값 묶음', params: { title: '다른 제목' }, expected: {} },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('DUPLICATE_NAME');
  });

  it('없는 케이스에는 저장하지 않는다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-404/param-sets',
      payload: { name: '아무거나', params: {}, expected: {} },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('CASE_NOT_FOUND');
  });

  it('DELETE /api/param-sets/:id — 지우면 목록에서 사라진다', async () => {
    const 만든것 = (
      await app.inject({
        method: 'POST',
        url: '/api/cases/XBR-002/param-sets',
        payload: { name: '지울 묶음', params: { title: '제목' }, expected: {} },
      })
    ).json();

    const res = await app.inject({ method: 'DELETE', url: `/api/param-sets/${만든것.id}` });
    expect(res.statusCode).toBe(204);

    const body = (await app.inject({ method: 'GET', url: '/api/cases/XBR-002/param-sets' })).json();
    expect(body.items.map((i: { name: string }) => i.name)).not.toContain('지울 묶음');
  });

  it('없는 묶음을 지우려 하면 404다', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/param-sets/999999999' });
    expect(res.statusCode).toBe(404);
  });

  // 검사 없이 지나가던 자리들이다. Number('abc')는 NaN 이고 Number.isInteger(1e21)은 true다 —
  // 둘 다 그대로 Postgres 로 가면 잡히지 않은 500 이 된다
  it('경로의 번호가 정수 범위를 벗어나면 500이 아니라 400이다', async () => {
    for (const 값 of ['abc', '1e21', '0', '-1']) {
      const 자리들 = [
        { method: 'POST' as const, url: `/api/runs/${값}/abort` },
        { method: 'GET' as const, url: `/api/runs/${값}` },
        { method: 'GET' as const, url: `/api/runs/${값}/items/1` },
        { method: 'GET' as const, url: `/api/runs/1/items/${값}` },
        { method: 'DELETE' as const, url: `/api/param-sets/${값}` },
        { method: 'GET' as const, url: `/api/screenshots/${값}/1/1.png` },
        { method: 'GET' as const, url: `/api/screenshots/1/${값}/1.png` },
        { method: 'GET' as const, url: `/api/screenshots/1/1/${값}.png` },
      ];
      for (const 자리 of 자리들) {
        const res = await app.inject(자리);
        expect(res.statusCode, `${자리.method} ${자리.url}`).toBe(400);
        expect(res.json().error, `${자리.method} ${자리.url}`).toBe('INVALID_REQUEST');
      }
    }
  });

  // 케이스는 root 로 돌아 볼륨에 바로가기를 만들 수 있고, 바로가기는 읽는 admin 쪽에서 풀린다 (리뷰 M4)
  it('스크린샷이 볼륨 밖으로 가는 바로가기면 404 다 — admin 의 환경변수 같은 파일을 내주지 않는다', async () => {
    const 뿌리 = mkdtempSync(join(tmpdir(), 'xbr-shot-'));
    const 밖 = mkdtempSync(join(tmpdir(), 'xbr-out-'));
    const 앞 = process.env.PLATFORM_ARTIFACTS_DIR;
    process.env.PLATFORM_ARTIFACTS_DIR = 뿌리;
    try {
      writeFileSync(join(밖, 'environ'), 'SESSION_SECRET=비밀');
      mkdirSync(join(뿌리, 'runs', '7', '8'), { recursive: true });
      writeFileSync(join(뿌리, 'runs', '7', '8', '1.png'), 'png');
      symlinkSync(join(밖, 'environ'), join(뿌리, 'runs', '7', '8', '2.png'));
      expect((await app.inject({ method: 'GET', url: '/api/screenshots/7/8/1.png' })).statusCode).toBe(200);
      const res = await app.inject({ method: 'GET', url: '/api/screenshots/7/8/2.png' });
      expect(res.statusCode).toBe(404);
      expect(res.body).not.toContain('SESSION_SECRET');
    } finally {
      if (앞 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
      else process.env.PLATFORM_ARTIFACTS_DIR = 앞;
      rmSync(뿌리, { recursive: true, force: true });
      rmSync(밖, { recursive: true, force: true });
    }
  });
});

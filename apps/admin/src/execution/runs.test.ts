// routes.ts의 실행 경로(POST /api/runs와 조회 4종, 스크린샷 서빙)를 HTTP로 본다 (SPEC §7).
// 진짜 러너 대신 같은 계약을 흉내내는 서버를 붙인다 — 컨테이너 없이도 돌아야 하는 검사다.
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ExecuteRequest } from '@platform/kit';

import executionRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

const 서비스 = `
  WITH s AS (
    INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
    VALUES ('XBX', 'XBX 서비스', '#334455', 'https://xbx.example.com', 'xbx')
    ON CONFLICT (prefix) DO UPDATE SET is_active = true
    RETURNING id
  )
  INSERT INTO service_env (service_id, env, base_url)
  SELECT id, 'qa', 'https://qa.example.com' FROM s
  ON CONFLICT (service_id, env) DO UPDATE SET base_url = EXCLUDED.base_url`;

const 케이스 = `
  INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
  VALUES ($1, $2, $3, '["로그인 화면에 접근할 수 있다"]', $4, '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')
  ON CONFLICT (tc_id) DO UPDATE SET platforms = EXCLUDED.platforms`;

describe.skipIf(연결 === undefined)('실행 API', () => {
  let app: FastifyInstance;
  let 러너: FastifyInstance;
  let pool: Pool;
  let 받은요청: ExecuteRequest[] = [];

  async function 치운다(): Promise<void> {
    await pool.query("DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XBX%')");
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XBX%'");
  }

  // 디스패처는 뒤에서 돈다. POST가 돌려준 runId로 끝날 때까지 지켜본다
  async function 끝날때까지(runId: number): Promise<Record<string, unknown>> {
    for (let i = 0; i < 100; i += 1) {
      const body = (await app.inject({ method: 'GET', url: `/api/runs/${runId}` })).json();
      if (body.status === 'FINISHED') return body;
      await new Promise((done) => setTimeout(done, 20));
    }
    throw new Error(`실행 ${runId}이 끝나지 않았다`);
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(서비스);
    await pool.query(케이스, ['XBX-001', '두 환경 케이스', JSON.stringify(['desktop', 'mobile']), 'demo/XBX-001.spec.ts']);

    러너 = Fastify();
    러너.post('/execute', async (req) => {
      const body = req.body as ExecuteRequest;
      받은요청.push(body);
      return body.platform === 'mobile'
        ? { historyId: body.historyId, status: 'NA', durationMs: 12, steps: [], error: { message: 'TIMEOUT' } }
        : {
            historyId: body.historyId,
            status: 'FAIL',
            durationMs: 400,
            steps: [
              {
                seq: 1,
                title: '토큰을 검증한다',
                status: 'FAIL',
                durationMs: 88,
                assertions: [{ statement: '토큰이 발급된다', status: 'FAIL', actual: false, expected: true, blocker: true }],
                line: 19,
                screenshotPath: 'artifacts/runs/1/1/1.png',
              },
            ],
          };
    });
    await 러너.listen({ port: 0, host: '127.0.0.1' });
    const addr = 러너.server.address();
    process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;

    const 그림방 = await mkdtemp(join(tmpdir(), 'ws-b-'));
    await mkdir(join(그림방, 'runs', '7', '9'), { recursive: true });
    await writeFile(join(그림방, 'runs', '7', '9', '2.png'), Buffer.from('89504e470d0a1a0a', 'hex'));
    process.env.PLATFORM_ARTIFACTS_DIR = 그림방;

    app = Fastify();
    await app.register(executionRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await 러너.close();
    await 치운다();
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'XBX%'");
    await pool.query("DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix = 'XBX')");
    await pool.query("DELETE FROM service WHERE prefix = 'XBX'");
    await pool.end();
    delete process.env.RUNNER_URL;
    delete process.env.PLATFORM_ARTIFACTS_DIR;
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('POST /api/runs — 환경 2개를 고르면 항목이 2행 생기고 runId를 바로 돌려준다', async () => {
    받은요청 = [];
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: {
        title: 'XBX 두 환경 실행',
        env: 'qa',
        triggeredBy: '검수자',
        items: [{ tcId: 'XBX-001', platforms: ['desktop', 'mobile'], params: {}, expected: {} }],
      },
    });
    expect(res.statusCode).toBe(200);

    const runId = res.json().runId;
    expect(typeof runId).toBe('number');

    const 끝난것 = await 끝날때까지(runId);
    expect(끝난것.counts).toEqual({ total: 2, pass: 0, fail: 1, na: 1, running: 0 });
    expect(받은요청.map((r) => r.platform).sort()).toEqual(['desktop', 'mobile']);
  });

  it('러너에 넘긴 요청에 파일 경로와 제한 시간이 실린다', async () => {
    받은요청 = [];
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: {
        title: 'XBX 제한 시간 실행',
        env: 'qa',
        items: [{ tcId: 'XBX-001', platforms: ['desktop'], params: { 아이디: 'tester' }, expected: {}, timeoutMs: 5000 }],
      },
    });
    await 끝날때까지(res.json().runId);

    expect(받은요청[0]).toMatchObject({
      tcId: 'XBX-001',
      platform: 'desktop',
      filePath: 'demo/XBX-001.spec.ts',
      params: { 아이디: 'tester' },
      timeoutMs: 5000,
    });
  });

  it('실행자를 안 적으면 admin으로 남는다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: { title: 'XBX 실행자 없음', env: 'qa', items: [{ tcId: 'XBX-001', platforms: ['desktop'], params: {}, expected: {} }] },
    });
    const body = await 끝날때까지(res.json().runId);
    expect(body.triggeredBy).toBe('admin');
  });

  it('카탈로그에 없는 케이스는 404다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: { title: 'XBX 없는 케이스', env: 'qa', items: [{ tcId: 'XBX-404', platforms: ['desktop'], params: {}, expected: {} }] },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().detail).toContain('XBX-404');
  });

  it('POST /api/runs/:runId/abort — 끝난 실행을 멈추려 하면 409다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: { title: 'XBX 멈춤 대상', env: 'qa', items: [{ tcId: 'XBX-001', platforms: ['desktop'], params: {}, expected: {} }] },
    });
    const runId = res.json().runId;
    await 끝날때까지(runId);

    const 멈춤 = await app.inject({ method: 'POST', url: `/api/runs/${runId}/abort` });
    expect(멈춤.statusCode).toBe(409);
    expect(멈춤.json().error).toBe('NOT_RUNNING');
  });

  it('만들어질 항목이 상한을 넘으면 400에 상한과 요청 건수를 담아 준다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: {
        title: 'XBX 상한 초과',
        env: 'qa',
        repeat: 600,
        items: [{ tcId: 'XBX-001', platforms: ['desktop', 'mobile'], params: {}, expected: {} }],
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'TOO_MANY_ITEMS', limit: 1000, requested: 1200 });
  });

  it('대상 서버를 안 주면 400이다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: { title: 'XBX 환경 없음', items: [{ tcId: 'XBX-001', platforms: ['desktop'], params: {}, expected: {} }] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('같은 케이스와 환경이 두 번 들어오면 400이다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: {
        title: 'XBX 중복',
        env: 'qa',
        items: [
          { tcId: 'XBX-001', platforms: ['desktop'], params: {}, expected: {} },
          { tcId: 'XBX-001', platforms: ['desktop'], params: {}, expected: {} },
        ],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('제목이 없으면 400이다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: { title: '', env: 'qa', items: [{ tcId: 'XBX-001', platforms: ['desktop'], params: {}, expected: {} }] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/runs — 실행 목록이 최근 순으로 나온다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX' })).json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.items[0].runId).toBeGreaterThan(0);
  });

  it('GET /api/runs — service를 안 주면 400, 없는 서비스면 403이다', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/runs' })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/api/runs?service=NOPE' })).statusCode).toBe(403);
  });

  it('GET /api/runs — 그 서비스의 실행만 돌려준다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX' })).json();
    expect(body.items.length).toBeGreaterThan(0);
    for (const run of body.items) {
      expect(run.title.startsWith('XBX')).toBe(true);
      // 실행 기록 목록은 대상 서버를 시각 옆에 적는다 (SPEC §8.7)
      expect(run.env).toBe('qa');
    }
  });

  it('GET /api/runs/:runId/items/:historyId — 절차와 검증 문장이 온다', async () => {
    const 실행 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX' })).json();
    const 우리것 = 실행.items.find((r: { title: string }) => r.title === 'XBX 두 환경 실행');
    const run = (await app.inject({ method: 'GET', url: `/api/runs/${우리것.runId}` })).json();
    const 실패한것 = run.items.find((i: { platform: string }) => i.platform === 'desktop');

    const body = (
      await app.inject({ method: 'GET', url: `/api/runs/${우리것.runId}/items/${실패한것.historyId}` })
    ).json();
    expect(body.precondition).toEqual(['로그인 화면에 접근할 수 있다']);
    expect(body.steps[0].assertions[0].statement).toBe('토큰이 발급된다');
    expect(body.steps[0].assertions[0].blocker).toBe(true);
  });

  it('모바일 항목은 러너가 준 NA와 사유를 그대로 갖고 있다', async () => {
    const 실행 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX' })).json();
    const 우리것 = 실행.items.find((r: { title: string }) => r.title === 'XBX 두 환경 실행');
    const run = (await app.inject({ method: 'GET', url: `/api/runs/${우리것.runId}` })).json();
    const 모바일 = run.items.find((i: { platform: string }) => i.platform === 'mobile');
    expect(모바일.status).toBe('NA');
    expect(모바일.error.message).toBe('TIMEOUT');
  });

  it('없는 실행과 없는 항목은 404다', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/runs/999999999' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/runs/1/items/999999999' })).statusCode).toBe(404);
  });

  it('GET /api/cases/:tcId/history — 케이스 이력을 환경으로 거를 수 있다', async () => {
    const 전체 = (await app.inject({ method: 'GET', url: '/api/cases/XBX-001/history' })).json();
    expect(전체.total).toBeGreaterThanOrEqual(4);

    const 모바일 = (await app.inject({ method: 'GET', url: '/api/cases/XBX-001/history?platform=mobile' })).json();
    expect(모바일.items.every((i: { platform: string }) => i.platform === 'mobile')).toBe(true);
  });

  it('GET /api/runs/last-by-case — 케이스와 환경마다 마지막 1건만 준다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/runs/last-by-case' })).json();
    const 우리것 = body.items.filter((i: { tcId: string }) => i.tcId === 'XBX-001');
    expect(우리것).toHaveLength(2);
    expect(우리것.map((i: { platform: string }) => i.platform).sort()).toEqual(['desktop', 'mobile']);
  });

  it('GET /api/screenshots/... — 공유 볼륨의 원본을 그대로 내보낸다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/screenshots/7/9/2.png' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
  });

  it('없는 스크린샷은 404, 숫자가 아닌 경로는 400이다', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/screenshots/7/9/5.png' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/screenshots/7/9/..%2F..%2Fetc.png' })).statusCode).toBe(400);
  });
});

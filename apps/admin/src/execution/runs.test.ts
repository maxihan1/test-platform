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

    // 실패가 하나도 없는 실행. state=failed 가 이것을 빼야 검사가 무는 것이 된다 —
    // 러너 흉내가 늘 FAIL 을 내므로 이 한 건은 직접 넣는다
    await pool.query(
      `WITH r AS (
         INSERT INTO test_run (title, triggered_by, triggered_by_name, env, base_url,
                               service_name, service_id, tests_repo, status, finished_at)
         SELECT 'XBX 모두 통과', 'xbx-사람', '실행 검사용', 'qa', 'https://qa.example.com',
                'XBX 서비스', id, 'https://xbx.example.com', 'FINISHED', now()
           FROM service WHERE prefix = 'XBX'
         RETURNING run_id
       )
       INSERT INTO run_item (run_id, tc_id, tc_name, platform, file_path, params, expected,
                             param_schema, expected_schema, timeout_ms, status, duration_ms, finished_at)
       SELECT run_id, 'XBX-001', '두 환경 케이스', 'desktop', 'demo/XBX-001.spec.ts', '{}', '{}',
              '{}', '{}', 300000, 'PASS', 100, now() FROM r`,
    );

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
    // 진짜로 돌 때는 문(auth/gate.ts)이 req.user 를 실어 준다. 여기는 문을 안 끼우므로
    // 배정 목록만 흉내 낸다 — 마지막 결과 조회가 그 값으로 남의 서비스를 거른다 (§7)
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = {
        username: 'xbx-사람',
        displayName: '실행 검사용',
        role: 'operator',
        services: [{ id: 1, prefix: 'XBX', name: '실행 검사용', color: '#3A5FCD', envs: [], hasSlackWebhook: false, testsDir: 'xbx' }],
      };
    });
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
        items: [{ tcId: 'XBX-001', platforms: ['desktop', 'mobile'], params: {}, expected: {} }],
      },
    });
    expect(res.statusCode).toBe(200);

    const runId = res.json().runId;
    expect(typeof runId).toBe('number');

    const 끝난것 = await 끝날때까지(runId);
    expect(끝난것.counts).toEqual({ total: 2, pass: 0, fail: 1, na: 1, running: 0, unconfirmed: { total: 0, pass: 0, fail: 0, na: 0 } });
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

  it('본문에 실행자를 적어 보내도 그 값을 쓰지 않는다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: {
        title: 'XBX 실행자 사칭',
        env: 'qa',
        triggeredBy: '사장님',
        items: [{ tcId: 'XBX-001', platforms: ['desktop'], params: {}, expected: {} }],
      },
    });
    const body = await 끝날때까지(res.json().runId);
    expect(body.triggeredBy).not.toBe('사장님');
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

  it('GET /api/runs — 제목 일부로 거른다', async () => {
    const 전체 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX' })).json();
    const 걸림 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX&q=없을리없는제목' })).json();

    expect(걸림.items).toHaveLength(0);
    expect(전체.items.length).toBeGreaterThan(0);

    const 한조각 = 전체.items[0].title.slice(0, 6);
    const 맞음 = (await app.inject({
      method: 'GET',
      url: `/api/runs?service=XBX&q=${encodeURIComponent(한조각)}`,
    })).json();
    expect(맞음.items.length).toBeGreaterThan(0);
    for (const run of 맞음.items) expect(run.title).toContain(한조각);
  });

  it('GET /api/runs — 도는 것만 거르면 끝난 실행이 빠진다', async () => {
    // 이 fixture 의 실행은 전부 끝나 있다. 안 거르면 여러 건이 오므로 거짓으로 통과할 수 없다
    const 전체 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX' })).json();
    expect(전체.items.length).toBeGreaterThan(0);

    const 도는것 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX&state=running' })).json();
    expect(도는것.items).toHaveLength(0);
  });

  it('GET /api/runs — 실패가 섞인 실행만 거른다. status 칸이 아니라 집계에서 나온다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX&state=failed' })).json();

    expect(body.items.length).toBeGreaterThan(0);
    for (const run of body.items) expect(run.counts.fail).toBeGreaterThan(0);
    // 「모두 통과」 실행이 빠져 있어야 거른 것이다
    expect(body.items.some((r: { title: string }) => r.title === 'XBX 모두 통과')).toBe(false);
  });

  it('GET /api/runs — 대상 서버로 거른다', async () => {
    const 맞음 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX&env=qa' })).json();
    const 없음 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX&env=staging' })).json();

    expect(맞음.items.length).toBeGreaterThan(0);
    expect(없음.items).toHaveLength(0);
  });

  it('GET /api/runs — 거른 뒤의 총건수가 실제로 걸린 수와 같다', async () => {
    // state=failed 는 집계 조건이라 HAVING 이 붙는다. 총건수가 그것을 안 따라가면
    // 페이지 수가 거짓이 되고 빈 쪽이 생긴다 — §8.7 「고칠 것 5」가 이름 붙인 함정이다
    const 없는것 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX&q=없을리없는제목' })).json();
    expect(없는것.total).toBe(0);

    // 「모두 통과」 한 건이 fixture 에 있으므로 HAVING 이 실제로 한 줄을 뺀다.
    // 총건수를 HAVING 이전에 세면 여기서 어긋난다
    const 전체 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX' })).json();
    const 실패만 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX&state=failed' })).json();

    expect(실패만.items.length).toBeLessThan(전체.items.length);
    expect(실패만.total).toBe(실패만.items.length);
  });

  it('GET /api/runs — 그 서비스 전체의 집계를 같이 준다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX' })).json();

    expect(body.summary.runs).toBe(body.total);
    expect(body.summary.allPass).toBeGreaterThan(0);
    expect(body.summary.hasFail).toBeGreaterThan(0);
    expect(body.summary.allPass + body.summary.hasFail).toBeLessThanOrEqual(body.summary.runs);
    // 도는 실행은 소요가 없어 평균에서 뺀다. 몇 회를 셌는지도 같이 준다
    expect(body.summary.durationOf).toBeGreaterThan(0);
    expect(body.summary.avgDurationMs).toBeGreaterThan(0);
  });

  it('GET /api/runs — 거르개를 걸면 집계도 같이 좁아진다', async () => {
    // 보이는 것과 세는 것이 갈리면 사람은 3줄을 보면서 「42회」를 읽는다
    const 전체 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX' })).json();
    const 실패만 = (await app.inject({ method: 'GET', url: '/api/runs?service=XBX&state=failed' })).json();

    expect(실패만.summary.runs).toBe(실패만.total);
    expect(실패만.summary.runs).toBeLessThan(전체.summary.runs);
    expect(실패만.summary.allPass).toBe(0);
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

  it('GET /api/runs/last-by-case — 같은 자리에 최근 판정 흐름도 실어 준다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/runs/last-by-case' })).json();
    const 데스크톱 = body.items.find(
      (i: { tcId: string; platform: string }) => i.tcId === 'XBX-001' && i.platform === 'desktop',
    );

    expect(Array.isArray(데스크톱.recent)).toBe(true);
    expect(데스크톱.recent.length).toBeGreaterThanOrEqual(2);
    expect(데스크톱.recent.length).toBeLessThanOrEqual(5);
    // 맨 앞이 새 것이다. 배지(status)와 흐름의 첫 칸이 어긋나면 같은 실행을 두 값으로 말하게 된다
    expect(데스크톱.recent[0]).toBe(데스크톱.status);
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

// 서비스 지도 DB — trace 적재가 케이스 줄을 갈아 끼우고 화면 기록 통로가 화면 줄을 넣는다 (DB 접속이 있을 때만 돈다)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import Fastify from 'fastify';
import JSZip from 'jszip';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

const j = (...줄: unknown[]): string => 줄.map((l) => JSON.stringify(l)).join('\n');

// 단계 1 에서 부른 API 들. 단계 경계는 시각 100
async function 가짜zip(주소들: string[]): Promise<Buffer> {
  const 묶음 = new JSZip();
  묶음.file(
    'test.trace',
    j(
      { type: 'context-options', monotonicTime: 0 },
      { type: 'before', callId: 'test.attach@1', method: 'test.attach', class: 'Test', startTime: 100 },
      { type: 'after', callId: 'test.attach@1', attachments: [{ name: 'platform-step', file: 'attachments/s1' }] },
    ),
  );
  묶음.file('attachments/s1', '{"seq":1}');
  묶음.file(
    '1-trace.network',
    j(
      ...주소들.map((url) => ({
        type: 'resource-snapshot',
        snapshot: { _monotonicTime: 20, _resourceType: 'fetch', time: 3, request: { method: 'GET', url }, response: { status: 200, content: {} } },
      })),
    ),
  );
  return 묶음.generateAsync({ type: 'nodebuffer' });
}

const 화면 = { state: '로그아웃' as const, url: '/goods/:n', name: '상품', textFp: 'a1', structFp: 'b2', record: '# 기록', crawledAt: '2026-10-16T00:00:00Z' };

describe.skipIf(연결 === undefined)('서비스 지도 DB', () => {
  let pool: Pool;
  let 서비스 = 0;
  const 실행: number[] = [];
  let 임시 = '';
  const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;

  async function 항목(run: number, tcId: string, platform = 'desktop'): Promise<number> {
    const r = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected,
                             param_schema, expected_schema, status, duration_ms, finished_at)
            VALUES ($1, $2, $3, $2, 'xam.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', 'FAIL', 10, now())
         RETURNING history_id`,
      [run, tcId, platform],
    );
    return Number(r.rows[0]!.history_id);
  }

  async function 푼다(run: number, historyId: number, 주소들: string[]): Promise<void> {
    const { trace경로, trace를적재한다 } = await import('../execution/traceIngest.js');
    const 경로 = trace경로(run, historyId);
    mkdirSync(dirname(경로), { recursive: true });
    writeFileSync(경로, await 가짜zip(주소들));
    expect(await trace를적재한다(historyId)).toBe('DONE');
  }

  const 케이스줄 = async (tcId: string) =>
    (
      await pool.query<{ path: string; run_id: string; steps: number[] }>(
        `SELECT a.path, u.run_id, u.steps FROM service_api_use u JOIN service_api a ON a.id = u.api_id WHERE u.tc_id = $1 ORDER BY a.path`,
        [tcId],
      )
    ).rows.map((x) => ({ path: x.path, run: Number(x.run_id), steps: x.steps }));

  const 치우기 = async () => {
    await pool.query('DELETE FROM service_api WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM screen_link WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM screen_found WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM screen_record WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const { pool: 풀 } = await import('../db/index.js');
    pool = 풀;
    임시 = mkdtempSync(join(tmpdir(), 'xam-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XAM', 'XAM 서비스 지도 검사용', '#3A5FCD', '', 'xam')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    await 치우기();
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'https://qa.example.com') ON CONFLICT DO NOTHING`, [서비스]);
    for (const 제목 of ['XAM 앞 실행', 'XAM 뒤 실행']) {
      const r = await pool.query<{ run_id: string }>(
        `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id)
              VALUES ($1, 'XAM', '', 'xam', 'qa', 'https://qa.example.com', 'FINISHED', $2) RETURNING run_id`,
        [제목, 서비스],
      );
      실행.push(Number(r.rows[0]!.run_id));
    }
  });

  beforeEach(async () => {
    await 치우기();
  });

  afterAll(async () => {
    await 치우기();
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
    rmSync(임시, { recursive: true, force: true });
  });

  it('같은 항목을 두 번 풀어도 줄이 안 늘고, 다른 도메인 요청은 지도에 안 든다', async () => {
    const [앞] = 실행;
    const h = await 항목(앞!, 'XAM-FN-001');
    const 주소 = ['https://api.example.com/orders/7', 'https://api.example.com/orders/8', 'https://ads.other.net/pixel'];
    await 푼다(앞!, h, 주소);
    await 푼다(앞!, h, 주소);

    expect(await 케이스줄('XAM-FN-001')).toEqual([{ path: '/orders/:n', run: 앞, steps: [1] }]);
    const 셈 = await pool.query<{ n: string }>('SELECT count(*) AS n FROM service_api WHERE service_id = $1', [서비스]);
    expect(Number(셈.rows[0]!.n)).toBe(1);
  });

  it('더 새 실행이 그 케이스 줄을 갈아 끼우고, 늦게 푼 옛 실행은 무시한다 · 같은 실행의 다른 기기는 합친다', async () => {
    const [앞, 뒤] = 실행;
    const 옛것 = await 항목(앞!, 'XAM-FN-002');
    const 새PC = await 항목(뒤!, 'XAM-FN-002');
    const 새모바일 = await 항목(뒤!, 'XAM-FN-002', 'mobile');

    await 푼다(앞!, 옛것, ['https://qa.example.com/api/old']);
    await 푼다(뒤!, 새PC, ['https://qa.example.com/api/new']);
    await 푼다(뒤!, 새모바일, ['https://qa.example.com/api/mobile']);
    await 푼다(앞!, 옛것, ['https://qa.example.com/api/old']);

    expect((await 케이스줄('XAM-FN-002')).map((x) => [x.path, x.run])).toEqual([
      ['/api/mobile', 뒤],
      ['/api/new', 뒤],
    ]);
    // 지도의 API 줄은 남는다 — 케이스가 안 거친 API 로 보인다
    const { 지도를읽는다 } = await import('./apiMap.js');
    const 옛API = (await 지도를읽는다(서비스)).apis.find((a) => a.path === '/api/old');
    expect(옛API).toMatchObject({ method: 'GET', host: 'qa.example.com', cases: [], screens: [] });
  });

  it('화면 기록 통로는 그 대상 서버와 같은 사이트 API 만 화면 줄로 넣고, 다시 올리면 갈아 끼우고, 화면 기록이 지워지면 같이 지운다', async () => {
    const { 다봄, 화면넣기 } = await import('./screens.js');
    const { 지도를읽는다 } = await import('./apiMap.js');
    await 화면넣기(서비스, 'qa', 화면, [], [
      { method: 'GET', url: 'https://qa.example.com/api/goods/12' },
      { method: 'GET', url: 'https://cdn.other.net/x.json' },
    ]);
    expect((await 지도를읽는다(서비스)).apis).toEqual([
      expect.objectContaining({ method: 'GET', host: 'qa.example.com', path: '/api/goods/:n', cases: [], screens: [{ env: 'qa', state: '로그아웃', url: '/goods/:n' }] }),
    ]);

    await 화면넣기(서비스, 'qa', 화면, [], [{ method: 'POST', url: 'https://qa.example.com/api/cart' }]);
    const 다시 = (await 지도를읽는다(서비스)).apis;
    expect(다시.find((a) => a.path === '/api/goods/:n')!.screens).toEqual([]);
    expect(다시.find((a) => a.path === '/api/cart')!.screens).toHaveLength(1);

    await 다봄(서비스, 'qa', [], ['로그아웃']);
    expect((await 지도를읽는다(서비스)).apis.every((a) => a.screens.length === 0)).toBe(true);
  });

  it('에이전트 통로 — PUT 화면 기록이 apis 를 받아 지도에 넣고 GET …/apis 가 그 요청 서비스의 지도를 준다 · apis 꼴이 틀리면 400', async () => {
    const 에이전트 = 'xam-agent';
    const 원래 = process.env.AUTHORING_AGENT_USER;
    process.env.AUTHORING_AGENT_USER = 에이전트;
    const { default: prdAgentRoutes } = await import('./agentRoutes.js');
    const app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 에이전트, displayName: '작성 에이전트', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(prdAgentRoutes, { prefix: '/api' });
    try {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by, compare, env)
         VALUES ($1, 'AUTHOR', '{}', 'xam', '검사', 'RUNNING', $2, true, 'qa') RETURNING id`,
        [서비스, 에이전트],
      );
      const 길 = `/api/authoring/requests/${r.rows[0]!.id}`;
      const 틀림 = await app.inject({ method: 'PUT', url: `${길}/screens`, payload: { ...화면, apis: [{ method: 'GET /x', url: 'https://qa.example.com/a' }] } });
      expect(틀림.json()).toEqual({ error: 'BAD_SCREEN', detail: 'apis.0.method' });

      const 넣음 = await app.inject({ method: 'PUT', url: `${길}/screens`, payload: { ...화면, apis: [{ method: 'GET', url: 'https://qa.example.com/api/goods/3' }] } });
      expect(넣음.statusCode).toBe(204);
      const 지도 = await app.inject({ method: 'GET', url: `${길}/apis` });
      expect(지도.json().apis).toEqual([expect.objectContaining({ method: 'GET', path: '/api/goods/:n', screens: [{ env: 'qa', state: '로그아웃', url: '/goods/:n' }] })]);
    } finally {
      await app.close();
      process.env.AUTHORING_AGENT_USER = 원래;
    }
  });
});

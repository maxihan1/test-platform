// 시나리오 실행 번호로 증적을 만들고(E2E 증적), 케이스 증적의 E2E 요약이 시나리오마다 마지막으로 끝난 실행을 읽는지 본다 (도메인/리포팅 §8.4)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import scenarioRunRoutes from '../scenario/runRoutes.js';
import { E2E요약 } from './e2eSummary.js';
import reportingRoutes from './routes.js';
import { findDocument } from './store.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('E2E 증적 · E2E 요약', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 증적폴더 = '';
  const 시나리오: Record<'돈것' | '안돈것' | '치운것', number> = { 돈것: 0, 안돈것: 0, 치운것: 0 };
  let 끝난실행 = 0;
  let 도는실행 = 0;
  let 케이스실행 = 0;

  const q = async <T extends object = Record<string, unknown>>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 치우기표 = async () => {
    await q('DELETE FROM evidence_document WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스]);
  };

  const 시나리오만들기 = async (이름: string, 살아있나: boolean): Promise<number> => {
    const s = await q<{ id: string }>(
      'INSERT INTO scenario (service_id, name, is_active, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
      [서비스, 이름, 살아있나, 'xde'],
    );
    const id = Number(s.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name)
       VALUES ($1, 1, 'desktop', $2, 'xde', 'XDE 검사 사람')`,
      [id, JSON.stringify([{ kind: 'mock', urlPattern: '**/api/pg/**', status: 200, contentType: 'application/json', body: '{}' }, { kind: 'wait', ms: 10 }])],
    );
    return id;
  };

  const 실행만들기 = async (시나리오번호: number, 상태: string, 시작: string, 부품판정: string[]): Promise<number> => {
    const r = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, env, status, service_id, service_name, tests_repo, base_url,
                             kind, scenario_id, scenario_version, started_at, finished_at)
       VALUES ('XDE 결제 흐름', 'xde', 'XDE 검사 사람', 'qa', $1, $2, 'XDE 서비스', 'https://git.example.com/xde', 'https://xde.example',
               'SCENARIO', $3, 1, $4, CASE WHEN $1 = 'RUNNING' THEN NULL ELSE $4::timestamptz END)
       RETURNING run_id`,
      [상태, 서비스, 시나리오번호, 시작],
    );
    const runId = Number(r.rows[0]!.run_id);
    await q(
      `INSERT INTO scenario_run_part (run_id, seq, kind, part, status, mocks, finished_at)
       VALUES ($1, 1, 'mock', $2, $3, '[]', now()), ($1, 2, 'wait', $4, $5, '["**/api/pg/**"]', now())`,
      [
        runId,
        JSON.stringify({ kind: 'mock', urlPattern: '**/api/pg/**', status: 200, contentType: 'application/json', body: '{}' }),
        부품판정[0],
        JSON.stringify({ kind: 'wait', ms: 10 }),
        부품판정[1],
      ],
    );
    return runId;
  };

  beforeAll(async () => {
    증적폴더 = await mkdtemp(join(tmpdir(), 'xde-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 증적폴더;
    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XDE', 'XDE E2E 증적 검사용', '#3A5FCD', '', 'xde')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기표();

    시나리오.돈것 = await 시나리오만들기('XDE 결제 흐름', true);
    시나리오.안돈것 = await 시나리오만들기('XDE 가입', true);
    시나리오.치운것 = await 시나리오만들기('XDE 치운 것', false);
    끝난실행 = await 실행만들기(시나리오.돈것, 'FINISHED', '2026-10-15T01:00:00.000Z', ['PASS', 'FAIL']);
    // 더 나중 실행이지만 아직 돈다 — 요약은 이것을 건너뛰고 끝난 것 중 마지막을 읽는다
    도는실행 = await 실행만들기(시나리오.돈것, 'RUNNING', '2026-10-16T01:00:00.000Z', ['NA', 'NA']);
    await 실행만들기(시나리오.치운것, 'FINISHED', '2026-10-15T02:00:00.000Z', ['PASS', 'PASS']);
    const c = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind)
       VALUES ('XDE 케이스 실행', 'xde', 'qa', 'FINISHED', $1, 'XDE 서비스', '', 'https://xde.example', 'FN')
       RETURNING run_id`,
      [서비스],
    );
    케이스실행 = Number(c.rows[0]!.run_id);

    app = Fastify();
    await app.register(reportingRoutes, { prefix: '/api' });
    await app.register(scenarioRunRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await 치우기표();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(증적폴더, { recursive: true, force: true });
    delete process.env.PLATFORM_ARTIFACTS_DIR;
  });

  it('E2E 요약 — 치우지 않은 시나리오마다 마지막으로 끝난 실행, 안 돌린 것은 시각이 없다', async () => {
    expect(await E2E요약(케이스실행)).toEqual([
      {
        scenarioId: 시나리오.돈것,
        name: 'XDE 결제 흐름',
        startedAt: '2026-10-15T01:00:00.000Z',
        verdict: 'FAIL',
        stoppedAt: 2,
        unconfirmed: false,
      },
      { scenarioId: 시나리오.안돈것, name: 'XDE 가입', startedAt: null, verdict: null, stoppedAt: null, unconfirmed: false },
    ]);
  });

  it('시나리오 실행 번호로 증적을 만들면 E2E 증적이 나오고 결과 응답의 evidence 에 쌓인다', async () => {
    const res = await app.inject({ method: 'POST', url: `/api/runs/${끝난실행}/evidence`, payload: { format: 'HTML' } });
    expect(res.statusCode).toBe(200);
    const { id } = res.json<{ id: number }>();

    let 문서 = await findDocument(id);
    for (let i = 0; i < 50 && 문서?.status === 'PENDING'; i += 1) {
      await new Promise((r) => setTimeout(r, 100));
      문서 = await findDocument(id);
    }
    expect(문서?.status).toBe('READY');
    const 글 = await readFile(문서!.filePath!, 'utf8');
    expect(글).toContain('<dd>E2E 시나리오</dd>');
    expect(글).toContain('**/api/pg/** → 200 (실제 서버 응답이 아님)');
    expect(글).toContain('<section class="stage mocked">');

    const 결과 = await app.inject({ method: 'GET', url: `/api/runs/${끝난실행}/scenario` });
    expect(결과.json<{ evidence: { id: number; format: string; status: string }[] }>().evidence).toEqual([
      expect.objectContaining({ id, format: 'HTML', status: 'READY' }),
    ]);
  });

  it('도는 시나리오 실행은 409 이고, 견주기 · 실패 카드는 시나리오 실행에 그대로 404 다', async () => {
    const 도는중 = await app.inject({ method: 'POST', url: `/api/runs/${도는실행}/evidence`, payload: { format: 'PDF' } });
    expect(도는중.statusCode).toBe(409);
    const 견주기 = await app.inject({ method: 'GET', url: `/api/runs/${끝난실행}/insights` });
    expect(견주기.statusCode).toBe(404);
    const 실패카드 = await app.inject({ method: 'GET', url: `/api/runs/${끝난실행}/failures?page=1` });
    expect(실패카드.statusCode).toBe(404);
  });
});

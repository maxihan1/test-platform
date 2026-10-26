// 실패 요구사항 · 카드 판정 · 버그 남기기 검사 — reqs · judgment · 버그남기기 (도메인/리포팅 「실패 요구사항」)
// 버그를 고르는 통로(결정 진행)의 권한 · 거절은 authoring/decisions.test.ts 가 본다. CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 버그남기기 } from './failReqs.js';
import reportingRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('실패 요구사항 · 판정', () => {
  let pool: Pool;
  let 라우트앱: FastifyInstance;
  let 서비스 = 0;
  let 끝남 = 0;

  async function 치우기(): Promise<void> {
    const 서비스들 = (await pool.query<{ id: string }>(`SELECT id FROM service WHERE prefix = 'XDB'`)).rows.map((r) => Number(r.id));
    if (서비스들.length === 0) return;
    await pool.query('DELETE FROM run_case_bug WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM scenario WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM req_case WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM prd_version WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [서비스들]);
  }

  async function 실행만들기(): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, finished_at)
       VALUES ('XDB 실행', 'xdb', 'qa', 'FINISHED', $1, 'XDB 마켓', '', '', 'UI', now())
       RETURNING run_id`,
      [서비스],
    );
    return Number(r.rows[0]!.run_id);
  }

  async function 항목(runId: number, tcId: string, platform: string, status: string, attempt = 1): Promise<void> {
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, params, expected, param_schema, expected_schema, status, attempt, finished_at)
       VALUES ($1, $2, $3, $4, '', '{}', '{}', '{}', '{}', $5, $6, now())`,
      [runId, tcId, platform, `${tcId} 케이스`, status, attempt],
    );
  }

  async function 요구(reqId: string, tcId: string, axis = '정상'): Promise<void> {
    await pool.query('INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, $2, $3, $4)', [서비스, reqId, tcId, axis]);
  }

  async function 화면이맞음(runId: number, tcId: string, 사람: string, 폐기 = false): Promise<number> {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, discarded_at)
       VALUES ($1, 'AUTHOR', $2, $3, $3, 'DONE', CASE WHEN $4 THEN now() ELSE NULL END) RETURNING id`,
      [서비스, JSON.stringify({ prdApply: true, screenRight: { runId, tcId, env: 'qa', reqIds: ['XDB-R1'] } }), 사람, 폐기],
    );
    return Number(r.rows[0]!.id);
  }

  const 버그 = (tcId: string, 이름 = 'xdb-writer') => 버그남기기(끝남, tcId, { username: 이름, displayName: 이름 });

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치우기();
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XDB', 'XDB 마켓', '#445566', '', 'xdb') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);

    const 판 = [
      { reqId: 'XDB-R2', feature: '가입', text: '두 번째 요구', basis: [], status: '확정' },
      { reqId: 'XDB-R1', feature: '가입', text: '첫 번째 요구', basis: [], status: '확정' },
    ];
    await pool.query(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 1, $2, 2, 'PERSON', 'xdb', '검사')`,
      [서비스, JSON.stringify(판)],
    );

    끝남 = await 실행만들기();
    await 항목(끝남, 'XDB-001', 'desktop', 'FAIL');
    await 항목(끝남, 'XDB-001', 'mobile', 'PASS');
    await 항목(끝남, 'XDB-002', 'mobile', 'FAIL');
    await 항목(끝남, 'XDB-003', 'desktop', 'PASS');
    await 항목(끝남, 'XDB-004', 'desktop', 'FAIL');
    await 항목(끝남, 'XDB-005', 'desktop', 'PASS');
    await 항목(끝남, 'XDB-005', 'desktop', 'FAIL', 2);

    await 요구('XDB-R1', 'XDB-001');
    await 요구('XDB-R1', 'XDB-001', '경계');
    await 요구('XDB-R2', 'XDB-001', '예외');
    await 요구('XDB-R2', 'XDB-002');
    await 요구('XDB-R1', 'XDB-003');
    await 요구('XDB-R1', 'XDB-005');
    await 요구('XDB-OLD', 'XDB-002');

    라우트앱 = Fastify();
    await 라우트앱.register(reportingRoutes, { prefix: '/api' });
    await 라우트앱.ready();
  });

  afterAll(async () => {
    await 라우트앱.close();
    await 치우기();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('failures 카드마다 reqs 는 축이 달라도 번호 한 줄이고 judgment 는 비어 있다', async () => {
    const res = await 라우트앱.inject({ method: 'GET', url: `/api/runs/${String(끝남)}/failures?page=1` });

    const 카드 = (res.json().items as { tcId: string; reqs: unknown[]; judgment: unknown }[]).find((c) => c.tcId === 'XDB-001')!;
    expect(카드.reqs).toEqual([
      { reqId: 'XDB-R2', text: '두 번째 요구' },
      { reqId: 'XDB-R1', text: '첫 번째 요구' },
    ]);
    expect(카드.judgment).toBeNull();
    const 없음 = (res.json().items as { tcId: string; reqs: unknown[] }[]).find((c) => c.tcId === 'XDB-004')!;
    expect(없음.reqs).toEqual([]);
    const 옛번호 = (res.json().items as { tcId: string; reqs: unknown[] }[]).find((c) => c.tcId === 'XDB-002')!;
    expect(옛번호.reqs).toEqual([
      { reqId: 'XDB-R2', text: '두 번째 요구' },
      { reqId: 'XDB-OLD', text: null },
    ]);
  });

  it('버그는 두 번 남겨도 처음 것이 남는다', async () => {
    const 첫 = await 버그('XDB-002');

    expect(첫).toMatchObject({ byName: 'xdb-writer' });
    expect(await 버그('XDB-002', '나중')).toEqual(첫);
    const 줄수 = await pool.query('SELECT 1 FROM run_case_bug WHERE run_id = $1 AND tc_id = $2', [끝남, 'XDB-002']);
    expect(줄수.rowCount).toBe(1);
  });

  it('버그를 남기면 그 카드의 judgment 가 BUG 로 보인다', async () => {
    const res = await 라우트앱.inject({ method: 'GET', url: `/api/runs/${String(끝남)}/failures?page=1` });

    const 카드 = (res.json().items as { tcId: string; judgment: { kind: string; byName: string } | null }[]).find((c) => c.tcId === 'XDB-002')!;
    expect(카드.judgment).toMatchObject({ kind: 'BUG', byName: 'xdb-writer' });
  });

  it('화면이 맞음 작성 요청이 버그를 이기고 폐기한 요청은 치지 않는다', async () => {
    await 버그('XDB-001');
    await 화면이맞음(끝남, 'XDB-001', '먼저');
    const 나중 = await 화면이맞음(끝남, 'XDB-001', '나중');
    await 화면이맞음(끝남, 'XDB-002', '폐기됨', true);

    const res = await 라우트앱.inject({ method: 'GET', url: `/api/runs/${String(끝남)}/failures?page=1` });

    const 카드들 = res.json().items as { tcId: string; judgment: { kind: string; byName: string; requestId?: number } | null }[];
    expect(카드들.find((c) => c.tcId === 'XDB-001')!.judgment).toMatchObject({ kind: 'SCREEN', requestId: 나중, byName: '나중' });
    expect(카드들.find((c) => c.tcId === 'XDB-002')!.judgment?.kind).toBe('BUG');
  });

  it('화면이 맞음 목록에 더해진 케이스마다 판정이 서고 누른 사람 · 때는 그 칸 것이다 (PRD-F9-20)', async () => {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
       VALUES ($1, 'AUTHOR', $2, '처음', '처음', 'PENDING') RETURNING id`,
      [
        서비스,
        JSON.stringify({
          prdApply: true,
          screenRight: [
            { runId: 끝남, tcId: 'XDB-001', env: 'qa', reqIds: ['XDB-R1'], byName: '처음', at: '2099-10-13T01:00:00.000Z' },
            { runId: 끝남, tcId: 'XDB-002', env: 'qa', reqIds: ['XDB-R1'], byName: '둘째', at: '2099-10-13T02:00:00.000Z' },
          ],
        }),
      ],
    );

    const res = await 라우트앱.inject({ method: 'GET', url: `/api/runs/${String(끝남)}/failures?page=1` });

    const 카드들 = res.json().items as { tcId: string; judgment: { kind: string; byName: string; at: string; requestId?: number } | null }[];
    expect(카드들.find((c) => c.tcId === 'XDB-002')!.judgment).toEqual({ kind: 'SCREEN', requestId: Number(r.rows[0]!.id), byName: '둘째', at: '2099-10-13T02:00:00.000Z' });
    expect(카드들.find((c) => c.tcId === 'XDB-001')!.judgment).toMatchObject({ kind: 'SCREEN', byName: '처음' });
  });

  it('실패 항목이 없는 케이스는 NOT_FAILED 이고 아무것도 안 남긴다', async () => {
    expect(await 버그('XDB-003')).toBe('NOT_FAILED');
    const 줄수 = await pool.query('SELECT 1 FROM run_case_bug WHERE run_id = $1 AND tc_id = $2', [끝남, 'XDB-003']);
    expect(줄수.rowCount).toBe(0);
  });
});

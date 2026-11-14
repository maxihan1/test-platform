// QA 리포트 비기능 재료 — 안정화 신규 · 증가 · 재발 종류와 AI 실행 요약 · 성능은 종류마다 마지막 실행 (DB 접속이 있을 때만 돈다)
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 비기능재료읽기 } from './qaReportNonFunc.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('QA 리포트 비기능 재료', { timeout: 60_000 }, () => {
  let pool: Pool;
  let 앱 = 0;
  const 실행 = { 앞: 0, 뒤: 0 };
  const 성능 = { 앞: 0, 뒤: 0 };
  const 오류 = { 신규: 0, 증가: 0, 재발: 0, 기존: 0, 앞날증가: 0, 빌드안재발: 0 };

  const 실행만들기 = async (시작: string) =>
    Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, triggered_by_name, env, base_url, status, service_id, kind, origin, build_no, started_at, finished_at)
           VALUES ('XQN 정기', 'XQN 웹', '', '스케줄러', '스케줄러', 'qa', 'https://qa.xqn.test', 'FINISHED', $1, 'UI', 'SCHEDULED', '3.0', $2, $2::timestamptz + interval '1 hour')
           RETURNING run_id`,
          [앱, 시작],
        )
      ).rows[0]!.run_id,
    );
  const 종류만들기 = async (fp: string, title: string, firstBuild: string) =>
    Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO stab_error (service_id, env, source, fingerprint, title, first_run_id, first_day, first_build_no, issue_key)
           VALUES ($1, 'qa', 'WEB_CONSOLE', $2, $3, $4, '2026-11-12', $5, CASE WHEN $2 = 'xqn-up' THEN 'XQN-7' END) RETURNING id`,
          [앱, fp, title, 실행.앞, firstBuild],
        )
      ).rows[0]!.id,
    );
  const 줄 = (runId: number, errorId: number, state: string, cases: number) =>
    pool.query('INSERT INTO stab_run_error (run_id, error_id, state, cases, hits) VALUES ($1, $2, $3, $4, $4)', [runId, errorId, state, cases]);
  const 성능만들기 = async (시작: string, lcp: number) =>
    Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO perf_run (kind, service_id, env, base_url, config, status, verdict, targets, origin, triggered_by, triggered_by_name, build_no, started_at, finished_at)
           VALUES ('PAGE', $1, 'qa', 'https://qa.xqn.test', '{}', 'DONE', 'FAIL', $2, 'MANUAL', 'xqn-p', 'P', '3.0', $3, $3) RETURNING id`,
          [앱, JSON.stringify([{ metric: 'LCP', scope: '/home', op: '<=', value: 2500, source: 'AI', measured: lcp, verdict: lcp <= 2500 ? 'PASS' : 'FAIL' }]), 시작],
        )
      ).rows[0]!.id,
    );

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    const 프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQN 프로젝트') RETURNING id`)).rows[0]!.id);
    앱 = Number((await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQN', 'XQN 웹', '#3A5FCD', '', 'xqn', $1) RETURNING id`, [프로젝트])).rows[0]!.id);
    실행.앞 = await 실행만들기('2026-11-12T01:00:00Z');
    실행.뒤 = await 실행만들기('2026-11-13T01:00:00Z');

    오류.신규 = await 종류만들기('xqn-new', '이 빌드에서 처음 난 오류', '3.0');
    오류.증가 = await 종류만들기('xqn-up', '늘어난 오류', '2.0');
    오류.재발 = await 종류만들기('xqn-re', '다시 난 오류', '2.0');
    오류.기존 = await 종류만들기('xqn-old', '그대로인 오류', '2.0');
    오류.앞날증가 = await 종류만들기('xqn-prev-up', '앞날에만 늘었던 오류', '2.0');
    오류.빌드안재발 = await 종류만들기('xqn-same-build-re', '이 빌드에서 났다가 해결 뒤 다시 난 오류', '3.0');
    const 요약 = {
      headline: '콘솔 오류가 하루 사이 늘었습니다',
      changes: [{ errorId: 오류.증가, text: '장바구니에서 늘었습니다' }],
      features: [{ name: '장바구니', tcIds: ['XQN-UI-001', 'XQN-UI-009'] }],
      verified: '해결 확인한 오류 없음',
      trend: '사흘째 늘고 있습니다',
      errors: [],
    };
    const 일 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO perf_ai_job (kind, service_id, input, status, created_by, output) VALUES ('STAB_SUMMARY', $1, '{}', 'DONE', '스케줄러', $2) RETURNING id`,
          [앱, JSON.stringify(요약)],
        )
      ).rows[0]!.id,
    );
    for (const [runId, day, aiJob] of [[실행.앞, '2026-11-12', null], [실행.뒤, '2026-11-13', 일]] as const)
      await pool.query(
        `INSERT INTO stab_run (run_id, service_id, env, day, build_no, cases, error_cases, pass_error_cases, residual, new_errors, resolved, confirmed, ai_job_id)
         VALUES ($1, $2, 'qa', $3, '3.0', 5, 3, 2, 4, 1, 0, 0, $4)`,
        [runId, 앱, day, aiJob],
      );
    // 앞날 — 신규가 처음 나고 다른 종류가 늘었다. 뒷날 — 신규는 그대로, 증가 · 재발 · 기존
    await 줄(실행.앞, 오류.신규, 'NEW', 3);
    await 줄(실행.앞, 오류.앞날증가, 'UP', 2);
    await 줄(실행.뒤, 오류.신규, 'ONGOING', 1);
    await 줄(실행.뒤, 오류.증가, 'UP', 4);
    await 줄(실행.뒤, 오류.재발, 'REOPENED', 2);
    await 줄(실행.뒤, 오류.기존, 'ONGOING', 1);
    await 줄(실행.앞, 오류.빌드안재발, 'NEW', 1);
    await 줄(실행.뒤, 오류.빌드안재발, 'REOPENED', 1);
    await pool.query(`INSERT INTO stab_occurrence (run_id, error_id, history_id, tc_id, item_status, hits, crash) VALUES ($1, $2, 1, 'XQN-UI-001', 'PASS', 1, false)`, [실행.뒤, 오류.증가]);

    성능.앞 = await 성능만들기('2026-11-12T02:00:00Z', 3100);
    성능.뒤 = await 성능만들기('2026-11-13T02:00:00Z', 1900);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM stab_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM stab_error WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM perf_ai_job WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM perf_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM service WHERE id = $1', [앱]);
  });

  const 읽기 = (buildNo: string | null) => 비기능재료읽기(pool, { runIds: [실행.앞, 실행.뒤], perfRunIds: [성능.앞, 성능.뒤], buildNo });

  it('증가 · 재발은 마지막 집계 줄 상태가 먼저고, 그 밖에 이 빌드에서 처음 난 종류는 신규다. 기존 · 앞날에만 늘었던 종류는 뺀다', async () => {
    const { 안정화 } = await 읽기('3.0');
    expect(안정화?.errors.map((e) => [e.state, e.title, e.cases, e.issueKey])).toEqual([
      ['NEW', '이 빌드에서 처음 난 오류', 1, null],
      ['UP', '늘어난 오류', 4, 'XQN-7'],
      ['REOPENED', '다시 난 오류', 2, null],
      ['REOPENED', '이 빌드에서 났다가 해결 뒤 다시 난 오류', 1, null],
    ]);
  });

  it('빌드 없는 리포트는 마지막 줄에서 신규인 종류만 신규다', async () => {
    const { 안정화 } = await 읽기(null);
    expect(안정화?.errors.map((e) => e.state)).toEqual(['UP', 'REOPENED', 'REOPENED']);
  });

  it('AI 실행 요약은 마지막 집계 줄의 일을 그대로 싣고 상태 · 기능별 숫자는 서버가 단다', async () => {
    const { 안정화 } = await 읽기('3.0');
    expect(안정화?.summary?.결과?.headline).toBe('콘솔 오류가 하루 사이 늘었습니다');
    expect(안정화?.summary?.changes).toEqual([{ state: 'UP', text: '장바구니에서 늘었습니다' }]);
    expect(안정화?.summary?.features).toEqual([{ name: '장바구니', errorCases: 1 }]);
  });

  it('성능은 같은 종류 · 시나리오에서 가장 늦게 시작한 실행 하나만 싣는다', async () => {
    const { 성능: 실행들 } = await 읽기('3.0');
    expect(실행들.map((r) => [r.id, r.targets[0]?.measured])).toEqual([[성능.뒤, 1900]]);
  });

  it('정기 실행 집계가 없으면 안정화 재료가 없다', async () => {
    expect((await 비기능재료읽기(pool, { runIds: [], perfRunIds: [], buildNo: '3.0' })).안정화).toBeNull();
  });
});

// 기능 테스트 목록 · 서랍의 「자동 수정」 재료 — 가장 늦은 줄 · 셈 · 거르기 · 상세 · 이력 「수정 후」 (도메인/BTS §7 · §8.15 「자동 수정 표시」 A)
// DATABASE_URL 이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { listCases } from '../catalog/store.js';
import { caseHistory } from '../execution/history.js';
import { 자동수정상세읽기 } from './testFixView.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('자동 수정 표시 재료', () => {
  let pool: Pool;
  const 서비스: Record<'XQV' | 'XQVN', number> = { XQV: 0, XQVN: 0 };
  const 케이스 = ['XQV-FN-001', 'XQV-FN-002', 'XQV-FN-003', 'XQVN-FN-001'];
  let 프로젝트 = 0;
  let 부모 = 0;
  let 한건 = 0;

  const 실행넣기 = async (service: 'XQV' | 'XQVN', tcId: string, 항목: { platform: string; status: string }[], rerunOf: number | null = null) => {
    const runId = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url, rerun_of, origin)
           VALUES ('XQV 실행', 'xqv', 'FINISHED', 'qa', $1, $2, '', 'https://qa.xqv.test', $3, $4) RETURNING run_id`,
          [서비스[service], service, rerunOf, rerunOf === null ? 'MANUAL' : 'SINGLE'],
        )
      ).rows[0]!.run_id,
    );
    for (const i of 항목) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at, file_path, param_schema, expected_schema, timeout_ms)
         VALUES ($1, $2, $3, '검사', '{}', '{}', $4, 100, now(), 'tests/xqv/a.spec.ts', '{}', '{}', 300000)`,
        [runId, tcId, i.platform, i.status],
      );
    }
    return runId;
  };

  const 줄넣기 = async (
    service: 'XQV' | 'XQVN',
    tcId: string,
    state: string,
    더: { merge?: string; rerun?: number; pr?: string; 늦게?: number; reason?: string } = {},
  ) => {
    const projectId = (await pool.query<{ project_id: string }>('SELECT project_id FROM service WHERE id = $1', [서비스[service]])).rows[0]!.project_id;
    await pool.query(
      `INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, moved_by, summary, pr_url, merge, rerun_id, state, reason, created_at)
       VALUES ($1, $2, $3, $4, 'qa', 'QA 맥시', '열린 페이지로 바꿨어요', $5, $6, $7, $8, $9, now() + make_interval(secs => $10))`,
      [projectId, `MQA-${tcId.slice(-1)}${더.늦게 ?? 0}`, 서비스[service], tcId, 더.pr ?? null, 더.merge ?? null, 더.rerun ?? null, state, 더.reason ?? null, 더.늦게 ?? 0],
    );
  };

  const 목록 = (service: string, autoFix?: boolean) => listCases({ service, q: '', activeOnly: true, page: 1, pageSize: 50, autoFix });

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQV 프로젝트') RETURNING id`)).rows[0]!.id);
    const 안이은 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQVN 프로젝트') RETURNING id`)).rows[0]!.id);
    for (const [접두사, 프] of [['XQV', 프로젝트], ['XQVN', 안이은]] as const) {
      서비스[접두사] = Number(
        (await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#112233', '', 'xqv', $2) RETURNING id`, [접두사, 프]))
          .rows[0]!.id,
      );
    }
    for (const tcId of 케이스) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $1, '["desktop","mobile"]', '[]', 'xqv/a.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
        [tcId],
      );
    }
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.example.com/', 'MQA', 'qahub-xqv', 's', '{}', '{}', 'xqv')`,
      [프로젝트],
    );

    // 001 — 앞 줄은 그만뒀고 가장 늦은 줄이 통과. 다시 실행은 부모에 붙은 한 건
    부모 = await 실행넣기('XQV', 'XQV-FN-001', [{ platform: 'desktop', status: 'FAIL' }, { platform: 'mobile', status: 'FAIL' }]);
    한건 = await 실행넣기('XQV', 'XQV-FN-001', [{ platform: 'desktop', status: 'PASS' }, { platform: 'mobile', status: 'PASS' }], 부모);
    await 줄넣기('XQV', 'XQV-FN-001', 'GAVE_UP', { reason: '테스트 수정 작성이 실패했어요' });
    await 줄넣기('XQV', 'XQV-FN-001', 'PASSED', { merge: 'AUTO', rerun: 한건, pr: 'https://github.com/o/r/pull/713', 늦게: 1 });
    // 002 — 앞 줄은 통과였지만 가장 늦은 줄이 병합 기다림 · 사람 확인 댓글
    await 줄넣기('XQV', 'XQV-FN-002', 'PASSED');
    await 줄넣기('XQV', 'XQV-FN-002', 'WAIT_MERGE', { pr: 'https://github.com/o/r/pull/9', 늦게: 1 });
    await pool.query(
      `INSERT INTO bts_outbox (project_id, kind, issue_key, payload) VALUES ($1, 'COMMENT', 'MQA-21', $2)`,
      [프로젝트, { body: '사람 확인이 필요해요 — 기대값이 바뀌었어요\nhttps://github.com/o/r/pull/9' }],
    );
    // BTS 를 안 이은 프로젝트의 줄은 보이지 않는다
    await 줄넣기('XQVN', 'XQVN-FN-001', 'PASSED');
  });

  afterAll(async () => {
    // bts_test_fix · bts_outbox 는 service 와, bts_link 는 project 와 같이 지워진다. 남은 애플리케이션이 없는 project 는 트리거가 지운다
    const ids = Object.values(서비스);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [ids]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1) AND rerun_of IS NOT NULL', [ids]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [ids]);
    await pool.end();
  });

  it('목록 줄마다 가장 늦은 줄 · 통과한 케이스만 센다', async () => {
    const 받은 = await 목록('XQV');
    const 줄 = new Map(받은.items.map((c) => [c.tcId, c.autoFix?.state ?? null]));
    expect(Object.fromEntries(줄)).toEqual({ 'XQV-FN-001': 'PASSED', 'XQV-FN-002': 'WAIT_MERGE', 'XQV-FN-003': null });
    expect(받은.autoFixCount).toBe(1);
  });

  it('?autoFix=1 은 가장 늦은 줄이 통과한 케이스만 — 셈은 그대로다', async () => {
    const 받은 = await 목록('XQV', true);
    expect(받은.items.map((c) => c.tcId)).toEqual(['XQV-FN-001']);
    expect(받은.autoFixCount).toBe(1);
  });

  it('BTS 를 안 이은 프로젝트는 칸이 null · 셈이 0 이다', async () => {
    const 받은 = await 목록('XQVN');
    expect(받은.items.map((c) => c.autoFix)).toEqual([null]);
    expect(받은.autoFixCount).toBe(0);
    expect(await 자동수정상세읽기('XQVN-FN-001')).toBeNull();
  });

  it('서랍 상세 — 이슈 고리 · 병합 · 화면에서 찾는 실행(붙은 부모) · 디바이스마다 결과', async () => {
    expect(await 자동수정상세읽기('XQV-FN-001')).toMatchObject({
      issueKey: 'MQA-11',
      issueUrl: 'https://bts.example.com/issues/MQA-11',
      state: 'PASSED',
      movedBy: 'QA 맥시',
      summary: '열린 페이지로 바꿨어요',
      merge: 'AUTO',
      prUrl: 'https://github.com/o/r/pull/713',
      rerunId: 부모,
      needsPerson: false,
      devices: [{ platform: 'desktop', status: 'PASS' }, { platform: 'mobile', status: 'PASS' }],
    });
  });

  it('병합 기다리는 줄에 「사람 확인이 필요해요」 댓글이 있으면 needsPerson', async () => {
    expect(await 자동수정상세읽기('XQV-FN-002')).toMatchObject({ state: 'WAIT_MERGE', needsPerson: true, rerunId: null, devices: [] });
    expect(await 자동수정상세읽기('XQV-FN-003')).toBeNull();
  });

  it('이력 줄 — 바퀴가 다시 돌린 한 건만 「수정 후」', async () => {
    const 이력 = await caseHistory('XQV-FN-001', undefined, 1, 20);
    expect(이력.items.map((r) => [r.runId, r.afterFix])).toEqual([
      [한건, true],
      [한건, true],
      [부모, false],
      [부모, false],
    ]);
  });
});

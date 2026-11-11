// 실행 기록의 「자동 수정」 재료 — 실패 카드 autoFix · 셈 · 거르기, 실행 목록 · 상세 autoFixed (도메인/BTS §7 · §8.15 「자동 수정 표시」 B)
// DATABASE_URL 이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findRun, listRuns } from '../execution/queries.js';
import { 실패카드 } from '../reporting/failures.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('실행 기록 자동 수정 표시', () => {
  let pool: Pool;
  let 프로젝트 = 0;
  let 서비스 = 0;
  let 처음 = 0;
  let 한건 = 0;

  const 실행넣기 = async (항목: { tcId: string; platform: string; status: string }[], rerunOf: number | null = null) => {
    const runId = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url, rerun_of, origin, finished_at)
           VALUES ('XQW 실행', 'xqw', 'FINISHED', 'qa', $1, 'XQW', '', 'https://qa.xqw.test', $2, $3, now()) RETURNING run_id`,
          [서비스, rerunOf, rerunOf === null ? 'MANUAL' : 'SINGLE'],
        )
      ).rows[0]!.run_id,
    );
    for (const i of 항목) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at, file_path, param_schema, expected_schema, timeout_ms)
         VALUES ($1, $2, $3, '검사', '{}', '{}', $4, 100, now(), 'tests/xqw/a.spec.ts', '{}', '{}', 300000)`,
        [runId, i.tcId, i.platform, i.status],
      );
    }
    return runId;
  };

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQW 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQW', 'XQW', '#112233', '', 'xqw', $1) RETURNING id`, [프로젝트]))
        .rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.example.com', 'MQA', 'qahub-xqw', 's', '{}', '{}', 'xqw')`,
      [프로젝트],
    );
    // 001 은 모바일만 실패했고 바퀴가 붙은 한 건으로 다시 돌려 둘 다 통과했다. 002 는 그냥 실패다
    처음 = await 실행넣기([
      { tcId: 'XQW-FN-001', platform: 'desktop', status: 'PASS' },
      { tcId: 'XQW-FN-001', platform: 'mobile', status: 'FAIL' },
      { tcId: 'XQW-FN-002', platform: 'desktop', status: 'FAIL' },
    ]);
    한건 = await 실행넣기(
      [
        { tcId: 'XQW-FN-001', platform: 'desktop', status: 'PASS' },
        { tcId: 'XQW-FN-001', platform: 'mobile', status: 'PASS' },
      ],
      처음,
    );
    await pool.query(
      `INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, failed_run, moved_by, pr_url, merge, rerun_id, state)
       VALUES ($1, 'MQA-168', $2, 'XQW-FN-001', 'qa', $3, 'QA 맥시', 'https://github.com/o/r/pull/713', 'AUTO', $4, 'PASSED')`,
      [프로젝트, 서비스, 처음, 한건],
    );
  });

  afterAll(async () => {
    // bts_test_fix 는 service 와, bts_link 는 project 와 같이 지워진다. 남은 애플리케이션이 없는 project 는 트리거가 지운다
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1 AND rerun_of IS NOT NULL', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.end();
  });

  it('붙은 한 건이 통과로 바꿔 끼워도 「수정 후 통과」 카드가 고치기 전 실패로 선다', async () => {
    const 받은 = await 실패카드(처음, 1);
    expect(받은.items.map((c) => [c.tcId, c.devices.map((d) => [d.platform, d.item.status])])).toEqual([
      ['XQW-FN-001', [['mobile', 'FAIL']]],
      ['XQW-FN-002', [['desktop', 'FAIL']]],
    ]);
    expect(받은.items[0]!.autoFix).toMatchObject({
      issueKey: 'MQA-168',
      issueUrl: 'https://bts.example.com/issues/MQA-168',
      movedBy: 'QA 맥시',
      prUrl: 'https://github.com/o/r/pull/713',
      merge: 'AUTO',
      rerunId: 처음,
      devices: [{ platform: 'desktop', status: 'PASS' }, { platform: 'mobile', status: 'PASS' }],
    });
    expect(받은.items[1]!.autoFix).toBeNull();
    expect(받은.autoFixCount).toBe(1);
  });

  it('?autoFix=1 은 자동 수정 카드만 — 셈은 그대로다', async () => {
    const 받은 = await 실패카드(처음, 1, undefined, true);
    expect(받은.items.map((c) => c.tcId)).toEqual(['XQW-FN-001']);
    expect([받은.total, 받은.autoFixCount]).toEqual([1, 1]);
  });

  it('실행 상세 · 목록은 처음 실행 숫자 그대로 — 고친 케이스가 통과 줄에 또 서지 않는다', async () => {
    const 상세 = (await findRun(처음))!;
    expect([상세.autoFixedCases, 상세.counts.fail]).toEqual([['XQW-FN-001'], 2]);
    expect(상세.items.filter((i) => i.tcId === 'XQW-FN-001').map((i) => [i.platform, i.status])).toEqual([
      ['desktop', 'PASS'],
      ['mobile', 'FAIL'],
    ]);
    const 목록 = await listRuns('XQW', 1, 20, { kind: 'case' });
    expect(목록.items.map((r) => [r.runId, r.counts.fail, 'autoFixed' in r ? r.autoFixed : null])).toEqual([[처음, 2, 1]]);
  });

  it('BTS 연결을 끊으면 표시가 사라지고 카드도 바꿔 끼운 결과로 돌아간다', async () => {
    await pool.query('DELETE FROM bts_link WHERE project_id = $1', [프로젝트]);
    const 받은 = await 실패카드(처음, 1);
    expect(받은.items.map((c) => [c.tcId, c.autoFix])).toEqual([['XQW-FN-002', null]]);
    expect(받은.autoFixCount).toBe(0);
    const 상세 = (await findRun(처음))!;
    expect([상세.autoFixedCases, 상세.counts.fail]).toEqual([[], 1]);
  });
});

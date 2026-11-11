// BTS 「테스트 수정」 바퀴 뒤 절반 — 반영 뒤 다시 실행 · 통과면 닫기 · 아니면 「QA 검토」로 되돌리기 · 단계마다 이슈 다시 읽기 · 60초 점검 (도메인/BTS 「테스트 수정 바퀴」 4 · 5 · 6)
// DATABASE_URL 이 있을 때만 돈다. 분배는 가짜로 바꿔 러너를 부르지 않는다

import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { 부르기함수 } from './client.js';
import { 실패등록 } from './failReport.js';
import { 자동반영실패 } from './testFixMerge.js';
import { 다시실행걸기, 테스트수정실행뒤, 테스트수정점검 } from './testFixRerun.js';

vi.mock('../execution/dispatcher.js', () => ({ dispatch: vi.fn(async () => undefined) }));

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('Issue Bunker 테스트 수정 다시 실행 · 끝', () => {
  let pool: Pool;
  let 프로젝트 = 0;
  let 서비스 = 0;
  const 팜 = process.env.DEVICE_FARM_URL;

  /** 이슈 상태 · 해결 상태 목록을 주는 가짜 Issue Bunker */
  const 답 = (상태 = 'fix', 코드 = 200): 부르기함수 => async (_자리, _method, 경로) => {
    if (경로 === '/api/v1/resolutions') return { status: 200, json: { data: [{ id: 'r-fixed', name: 'Fixed' }, { id: 'r-test', name: '테스트 문제' }] } };
    return 코드 === 200 ? { status: 200, json: { data: { currentStateKey: 상태 } } } : { status: 코드, json: null };
  };

  const 실행넣기 = async (항목: { tcId: string; platform: string; status: string; device?: string }[], 상태 = 'FINISHED') => {
    const runId = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url)
           VALUES ('XQR 실행', 'xqr', $2, 'qa', $1, 'XQR', '', 'https://qa.xqr.test') RETURNING run_id`,
          [서비스, 상태],
        )
      ).rows[0]!.run_id,
    );
    for (const i of 항목) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at, file_path, param_schema, expected_schema, timeout_ms, device)
         VALUES ($1, $2, $3, '검사', '{}', '{}', $4, 100, now(), 'tests/xqr/a.spec.ts', '{}', '{}', 300000, $5)`,
        [runId, i.tcId, i.platform, i.status, i.device ?? null],
      );
    }
    return runId;
  };

  /** 고침 작성 · (반영) · 바퀴 줄 · 짝 줄 — 줄 번호를 돌려준다 */
  const 바퀴 = async (key: string, tcId: string, 실패실행: number, 끝: { 반영?: boolean; 작성상태?: string; pr?: string | null; merge?: string } = {}) => {
    const pr = 끝.pr === undefined ? `https://github.com/o/r/pull/${tcId.slice(-3)}` : 끝.pr;
    const 뿌리 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, pr_url, stop_reason, stopped_by)
           VALUES ($1, 'AUTHOR', $2, 'bts', $3, $4, $5, $6, $7) RETURNING id`,
          [서비스, { prdApply: true, testFix: { issueKey: key, cases: [], note: '' } }, `Issue Bunker ${key}`, 끝.작성상태 ?? 'DONE', pr,
            끝.작성상태 === 'STOPPED' ? 'USER' : null, 끝.작성상태 === 'STOPPED' ? 'xqr' : null],
        )
      ).rows[0]!.id,
    );
    if (끝.반영 === true) {
      await pool.query(`INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, status) VALUES ($1, 'MERGE', $2, '{}', 'bts', 'DONE')`, [서비스, 뿌리]);
    }
    await pool.query(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, first_run) VALUES ($1, $2, $3, $4, 'qa', $5)`, [프로젝트, key, 서비스, tcId, 실패실행]);
    return Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, failed_run, moved_by, moved_by_id, request_id, pr_url, merge, state)
           VALUES ($1, $2, $3, $4, 'qa', $5, 'QA 김', 'u-qa', $6, $7, $8, $9) RETURNING id`,
          [프로젝트, key, 서비스, tcId, 실패실행, 뿌리, pr, 끝.merge ?? null, pr === null ? 'FIXING' : 'WAIT_MERGE'],
        )
      ).rows[0]!.id,
    );
  };
  const 줄 = async (id: number) =>
    (await pool.query<{ state: string; reason: string | null; rerun_id: string | null }>('SELECT state, reason, rerun_id FROM bts_test_fix WHERE id = $1', [id])).rows[0]!;
  const 보낼것 = async (key: string) =>
    (await pool.query<{ kind: string; payload: Record<string, unknown> }>('SELECT kind, payload FROM bts_outbox WHERE project_id = $1 AND issue_key = $2 ORDER BY id', [프로젝트, key])).rows;
  const 되돌림 = (까닭: string) => [
    { kind: 'TRANSITION', payload: { toStatusKey: 'qa_review' } },
    { kind: 'ASSIGN', payload: { assigneeId: 'u-qa' } },
    { kind: 'COMMENT', payload: { body: 까닭 } },
  ];

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQR 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQR', 'XQR 마켓', '#112233', '', 'xqr', $1) RETURNING id`, [프로젝트]))
        .rows[0]!.id,
    );
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'https://qa.xqr.test')`, [서비스]);
    for (const tcId of ['XQR-FN-001', 'XQR-FN-002']) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $1, '["desktop","mobile"]', '[]', 'xqr/a.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
        [tcId],
      );
    }
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.example.com', 'DM', 'qahub-xqr', 's', '{"TEST_FIX": "fix", "QA_REVIEW": "qa_review", "CLOSED": "closed"}', '{"TEST_PROBLEM": "테스트 문제"}', 'xqr')`,
      [프로젝트],
    );
  });

  afterEach(() => {
    if (팜 === undefined) delete process.env.DEVICE_FARM_URL;
    else process.env.DEVICE_FARM_URL = 팜;
  });

  afterAll(async () => {
    // bts_test_fix · bts_outbox · bts_issue_case 는 service 와, bts_link 는 project 와 같이 지워진다. 남은 애플리케이션이 없는 project 는 트리거가 지운다
    await pool.query(`DELETE FROM authoring_request WHERE service_id = $1 AND kind = 'MERGE'`, [서비스]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1 AND rerun_of IS NOT NULL', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query(`DELETE FROM test_case WHERE tc_id IN ('XQR-FN-001', 'XQR-FN-002')`);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.end();
  });

  it('반영이 끝나면 처음 실패한 실행에 붙여 실패 디바이스와 통과 디바이스를 실제 폰으로 다시 돌리고, 다 통과하면 「닫힘 · 테스트 문제」로 닫는다', async () => {
    process.env.DEVICE_FARM_URL = 'http://farm.xqr.test';
    const 실패 = await 실행넣기([
      { tcId: 'XQR-FN-001', platform: 'mobile', status: 'FAIL', device: 'R3CX' },
      { tcId: 'XQR-FN-001', platform: 'desktop', status: 'PASS' },
    ]);
    const id = await 바퀴('DM-1', 'XQR-FN-001', 실패, { 반영: true });
    await 다시실행걸기(id, 답());
    const 걸린 = await 줄(id);
    expect(걸린.state).toBe('RERUNNING');
    const 다시 = Number(걸린.rerun_id);
    expect(
      (await pool.query('SELECT origin, rerun_of, triggered_by, triggered_by_name FROM test_run WHERE run_id = $1', [다시])).rows[0],
    ).toEqual({ origin: 'SINGLE', rerun_of: String(실패), triggered_by: 'bts', triggered_by_name: 'Issue Bunker DM-1' });
    expect((await pool.query('SELECT platform FROM run_item WHERE run_id = $1 ORDER BY platform', [다시])).rows.map((r) => r.platform)).toEqual(['desktop', 'mobile']);
    // 다시 와도 실행은 하나다
    await 다시실행걸기(id, 답());
    expect((await pool.query('SELECT 1 FROM test_run WHERE rerun_of = $1', [실패])).rowCount).toBe(1);

    await pool.query(`UPDATE run_item SET status = 'PASS', finished_at = now(), device = CASE WHEN platform = 'mobile' THEN 'R3CX' END WHERE run_id = $1`, [다시]);
    await pool.query(`UPDATE test_run SET status = 'FINISHED' WHERE run_id = $1`, [다시]);
  });

  it('통과 판정 전에 이슈를 다시 읽어 「테스트 수정」일 때만 닫는다 — 못 닿으면 다음 점검에서, 닫으면 짝 줄을 테스트 문제로', async () => {
    const id = Number((await pool.query<{ id: string }>(`SELECT id FROM bts_test_fix WHERE issue_key = 'DM-1' AND project_id = $1`, [프로젝트])).rows[0]!.id);
    const 다시 = Number((await 줄(id)).rerun_id);
    await 테스트수정점검(답('fix', 503));
    expect((await 줄(id)).state).toBe('RERUNNING');
    await 테스트수정점검(답());
    expect((await 줄(id)).state).toBe('PASSED');
    expect(await 보낼것('DM-1')).toEqual([
      { kind: 'TRANSITION', payload: { toStatusKey: 'closed', resolutionId: 'r-test', comment: `실제 폰 · PC 에서 통과했어요 · RUN ${String(다시)}` } },
    ]);
    expect((await pool.query(`SELECT closed_at IS NOT NULL AS closed, resolution FROM bts_issue_case WHERE issue_key = 'DM-1' AND project_id = $1`, [프로젝트])).rows[0]).toEqual({
      closed: true,
      resolution: 'TEST_PROBLEM',
    });
  });

  it('다시 실행이 실패하면 「QA 검토」로 옮기고 옮긴 사람에게 돌려준다 · 사람이 이슈를 옮겼으면 아무것도 안 보낸다', async () => {
    const 실패 = await 실행넣기([{ tcId: 'XQR-FN-002', platform: 'desktop', status: 'FAIL' }]);
    const id = await 바퀴('DM-2', 'XQR-FN-002', 실패, { 반영: true });
    await 다시실행걸기(id, 답());
    const 다시 = Number((await 줄(id)).rerun_id);
    await pool.query(`UPDATE run_item SET status = 'FAIL', finished_at = now() WHERE run_id = $1`, [다시]);
    await pool.query(`UPDATE test_run SET status = 'FINISHED' WHERE run_id = $1`, [다시]);
    // 바퀴의 다시 실행은 실행 끝 실패 등록이 건너뛴다 — 열린 이슈에 「또 실패」 댓글이 되돌리기 댓글과 같이 달리지 않게
    expect(await 실패등록(다시, 0)).toBe(0);
    await 테스트수정실행뒤(다시, 답());
    expect(await 줄(id)).toMatchObject({ state: 'FAILED', reason: `PC 에서 통과하지 못했어요 · RUN ${String(다시)}` });
    expect(await 보낼것('DM-2')).toEqual(되돌림(`PC 에서 통과하지 못했어요 · RUN ${String(다시)}`));

    const 옮김 = await 바퀴('DM-3', 'XQR-FN-003', 실패, { 반영: true });
    await 다시실행걸기(옮김, 답('qa_review'));
    expect(await 줄(옮김)).toMatchObject({ state: 'GAVE_UP', reason: '사람이 이슈를 옮겼어요', rerun_id: null });
    expect(await 보낼것('DM-3')).toEqual([]);
  });

  it('반영 전이면 기다리고, 실제 폰이 필요한데 디바이스 팜이 없으면 실행 없이 되돌린다', async () => {
    delete process.env.DEVICE_FARM_URL;
    const 실패 = await 실행넣기([{ tcId: 'XQR-FN-004', platform: 'mobile', status: 'FAIL', device: 'R3CX' }]);
    const id = await 바퀴('DM-4', 'XQR-FN-004', 실패);
    await 다시실행걸기(id, 답());
    expect((await 줄(id)).state).toBe('WAIT_MERGE');
    await pool.query(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, status) SELECT $1, 'MERGE', request_id, '{}', 'bts', 'DONE' FROM bts_test_fix WHERE id = $2`,
      [서비스, id],
    );
    await 테스트수정점검(답());
    expect(await 줄(id)).toMatchObject({ state: 'FAILED', reason: '실제 폰을 못 잡아 확인하지 못했어요', rerun_id: null });
    expect(await 보낼것('DM-4')).toEqual(되돌림('실제 폰을 못 잡아 확인하지 못했어요'));
  });

  it('고침 작성이 실패 · 멈춤 · PR 없이 끝나면 점검이 되돌린다 · 자동 반영이 실패하면 사람 확인 댓글', async () => {
    const 실패 = await 실행넣기([{ tcId: 'XQR-FN-005', platform: 'desktop', status: 'FAIL' }]);
    const 깨짐 = await 바퀴('DM-5', 'XQR-FN-005', 실패, { 작성상태: 'FAILED', pr: null });
    await 테스트수정점검(답());
    expect(await 줄(깨짐)).toMatchObject({ state: 'FAILED', reason: '테스트 수정 작성이 실패했어요' });
    expect(await 보낼것('DM-5')).toEqual(되돌림('테스트 수정 작성이 실패했어요'));
    const 없음 = await 바퀴('DM-6', 'XQR-FN-006', 실패, { pr: null });
    await 테스트수정점검(답());
    expect(await 줄(없음)).toMatchObject({ state: 'FAILED', reason: '고칠 곳을 찾지 못했어요' });

    const 자동 = await 바퀴('DM-7', 'XQR-FN-007', 실패, { merge: 'AUTO' });
    const 뿌리 = Number((await pool.query<{ request_id: string }>('SELECT request_id FROM bts_test_fix WHERE id = $1', [자동])).rows[0]!.request_id);
    await 자동반영실패(뿌리);
    await 자동반영실패(뿌리);
    expect(await 보낼것('DM-7')).toEqual([{ kind: 'COMMENT', payload: { body: '사람 확인이 필요해요 — 자동 반영이 실패했어요\nhttps://github.com/o/r/pull/007' } }]);
    expect((await 줄(자동)).state).toBe('WAIT_MERGE');
  });
});

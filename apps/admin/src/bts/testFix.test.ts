// BTS 「테스트 수정」 바퀴 앞 절반 — 맡기(다시 읽기 · 옮긴 사람 · 담당자) · 한 번만 · 떠나면 놓기 · PR 열림 필드 · 댓글 (도메인/BTS 「테스트 수정 바퀴」 1 · 2)
// 결과 꼴 검사는 늘, 나머지는 DATABASE_URL 이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { BTS이슈, 부르기함수 } from './client.js';
import { 테스트수정PR열림, 테스트수정결과맞나, 테스트수정처리 } from './testFix.js';

describe('테스트 수정 끝내기 결과 꼴', () => {
  it('testFix 줄이고 고친 곳 · 다시 돌린 횟수가 꼴에 맞을 때만', () => {
    const 고침줄 = { prdApply: true, testFix: { issueKey: 'DM-1', cases: [], note: '' } };
    expect(테스트수정결과맞나(고침줄, { summary: '기다리기를 고쳤어요', reruns: 3 })).toBe(true);
    expect(테스트수정결과맞나({ prdApply: true }, { summary: '기다리기를 고쳤어요', reruns: 3 })).toBe(false);
    expect(테스트수정결과맞나(고침줄, { summary: '기다리기를 고쳤어요', reruns: -1 })).toBe(false);
    expect(테스트수정결과맞나(고침줄, { summary: 'x'.repeat(501), reruns: 3 })).toBe(false);
    expect(테스트수정결과맞나(고침줄, { reruns: 3 })).toBe(false);
  });
});

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('Issue Bunker 테스트 수정 맡기', () => {
  let pool: Pool;
  let 프로젝트 = 0;
  let 서비스 = 0;
  let 실행 = 0;
  const 자리 = { baseUrl: 'https://bts.example.com', 봇: 'qahub-xqf' };
  const 이은 = () => ({ projectId: 프로젝트, ...자리 });
  const 옮김 = { from: 'qa_review', to: 'fix' };
  const 이슈 = (key: string, state = 'fix'): BTS이슈 => ({ key, state, resolution: null, assigneeId: null, type: 'bug', summary: '', componentIds: [] });

  const 짝넣기 = (key: string, tcId: string, 첫실행 = 실행) =>
    pool.query(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, first_run) VALUES ($1, $2, $3, $4, 'qa', $5)`, [프로젝트, key, 서비스, tcId, 첫실행]);
  const 줄 = async (key: string) =>
    (
      await pool.query<{ tc_id: string; state: string; moved_by: string | null; moved_by_id: string | null; request_id: string | null; pr_url: string | null; summary: string | null; reason: string | null }>(
        'SELECT tc_id, state, moved_by, moved_by_id, request_id, pr_url, summary, reason FROM bts_test_fix WHERE issue_key = $1 AND service_id = $2 ORDER BY id',
        [key, 서비스],
      )
    ).rows;
  const 보낼것 = async (key: string) =>
    (await pool.query<{ kind: string; payload: Record<string, unknown> }>('SELECT kind, payload FROM bts_outbox WHERE project_id = $1 AND issue_key = $2 ORDER BY id', [프로젝트, key])).rows;
  const 요청 = async (id: number) =>
    (await pool.query<{ kind: string; params: Record<string, unknown>; requested_by: string; requested_by_name: string }>('SELECT kind, params, requested_by, requested_by_name FROM authoring_request WHERE id = $1', [id])).rows[0]!;
  const 짝열림 = async (key: string) => (await pool.query<{ open: boolean }>('SELECT closed_at IS NULL AS open FROM bts_issue_case WHERE issue_key = $1', [key])).rows[0]?.open;

  const 답 = (기록: number | null = 200): 부르기함수 => async (_자리, _method, 경로) => {
    if (경로.endsWith('/whoami')) return { status: 200, json: { userId: 'bot-1' } };
    if (경로.includes('/changelog')) {
      return 기록 === 200
        ? {
            status: 200,
            json: {
              content: [
                { actorId: 'u-new', actorName: '다른 사람', items: [{ field: 'priority', toValue: 'high' }] },
                { actorId: 'u-qa', actorName: 'QA 김', items: [{ field: 'status', fromValue: 'qa_review', toValue: 'fix' }] },
              ],
            },
          }
        : { status: 기록 ?? 500, json: null };
    }
    if (경로.endsWith('/comments')) return { status: 200, json: { data: [{ body: '실제 폰에서만 새 창을 못 띄웁니다' }] } };
    return { status: 200, json: { data: { key: 'DM-1', summary: '주문 실패', description: '테스트 쪽 문제' } } };
  };

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQF 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQF', 'XQF 마켓', '#112233', '', 'xqf', $1) RETURNING id`, [프로젝트]))
        .rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by, test_fix_field)
       VALUES ($1, $2, 'DM', $3, 's', '{"TEST_FIX": "fix", "CLOSED": "closed"}', '{}', 'xqf', 'qahub_test_fix_pr')`,
      [프로젝트, 자리.baseUrl, 자리.봇],
    );
    실행 = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url)
           VALUES ('XQF 실행', 'xqf', 'FINISHED', 'qa', $1, 'XQF', '', 'https://qa.xqf.test') RETURNING run_id`,
          [서비스],
        )
      ).rows[0]!.run_id,
    );
    for (const tcId of ['XQF-FN-001', 'XQF-FN-002', 'XQF-FN-003']) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at, file_path, param_schema, expected_schema, timeout_ms)
         VALUES ($1, $2, 'mobile', '검사', '{}', '{}', 'FAIL', 100, now(), 'tests/xqf/a.spec.ts', '{}', '{}', 300000)`,
        [실행, tcId],
      );
    }
  });

  afterAll(async () => {
    // bts_test_fix · bts_outbox · bts_issue_case 는 service 와, bts_link 는 project 와 같이 지워진다. 남은 애플리케이션이 없는 project 는 트리거가 지운다
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.end();
  });

  it('「테스트 수정」으로 옮기면 맡는다 — 고침 요청 · 옮긴 사람 · 담당자 「QA Hub AI」 · 짝 줄은 연 채로, 같은 알림이 또 와도 한 번', async () => {
    await 짝넣기('DM-1', 'XQF-FN-001');
    const { 요청들: [id], 기록만 } = await 테스트수정처리(이은(), 이슈('DM-1'), 옮김, 답());
    expect(기록만).toEqual([]);
    const 행 = await 요청(id!);
    expect(행).toMatchObject({ kind: 'AUTHOR', requested_by: 'bts', requested_by_name: 'Issue Bunker DM-1' });
    expect(행.params).toMatchObject({ prdApply: true, testFix: { issueKey: 'DM-1', cases: [{ runId: 실행, tcId: 'XQF-FN-001', env: 'qa' }] }, decision: { count: 1 } });
    expect((행.params.testFix as { note: string }).note).toContain('실제 폰에서만 새 창을 못 띄웁니다');
    expect(await 줄('DM-1')).toEqual([expect.objectContaining({ tc_id: 'XQF-FN-001', state: 'FIXING', moved_by: 'QA 김', moved_by_id: 'u-qa', request_id: String(id) })]);
    expect(await 짝열림('DM-1')).toBe(true);
    expect(await 보낼것('DM-1')).toEqual([{ kind: 'ASSIGN', payload: { assigneeId: 'bot-1' } }]);
    expect(await 테스트수정처리(이은(), 이슈('DM-1'), 옮김, 답())).toEqual({ 요청들: [], 기록만: [] });
    expect(await 줄('DM-1')).toHaveLength(1);
  });

  it('알림이 그 상태로 옮긴 것이 아니거나 다시 읽은 이슈가 그 상태가 아니면 아무것도 안 한다', async () => {
    await 짝넣기('DM-2', 'XQF-FN-002');
    expect(await 테스트수정처리(이은(), 이슈('DM-2', 'qa_review'), 옮김, 답())).toEqual({ 요청들: [], 기록만: [] });
    expect(await 테스트수정처리(이은(), 이슈('DM-2'), { from: 'open', to: 'qa_review' }, 답())).toEqual({ 요청들: [], 기록만: [] });
    expect(await 테스트수정처리(이은(), 이슈('DM-2'), {}, 답())).toEqual({ 요청들: [], 기록만: [] });
    expect(await 줄('DM-2')).toEqual([]);
  });

  it('변경 기록을 BTS 가 바빠 못 읽으면 던지고 아무것도 안 세운다 — 권한 · 없음(4xx)은 옮긴 사람 없이 간다', async () => {
    await expect(테스트수정처리(이은(), 이슈('DM-2'), 옮김, 답(503))).rejects.toThrow('DM-2');
    expect(await 줄('DM-2')).toEqual([]);
    const { 요청들 } = await 테스트수정처리(이은(), 이슈('DM-2'), 옮김, 답(403));
    expect(요청들).toHaveLength(1);
    expect(await 줄('DM-2')).toEqual([expect.objectContaining({ moved_by: null, moved_by_id: null, state: 'FIXING' })]);
  });

  it('사람이 올린 이슈는 맡지 않고 한 번만 알린다 · 다른 이슈가 이미 고치는 테스트는 그 이슈 키를 알린다', async () => {
    expect(await 테스트수정처리(이은(), 이슈('DM-3'), 옮김, 답())).toEqual({ 요청들: [], 기록만: [] });
    await 테스트수정처리(이은(), 이슈('DM-3'), 옮김, 답());
    expect(await 보낼것('DM-3')).toEqual([{ kind: 'COMMENT', payload: { body: 'Test Commander 가 올린 실패 이슈만 테스트를 수정할 수 있어요' } }]);
    // 열린 짝은 테스트마다 하나다 — 앞 이슈의 짝이 닫혔는데 고침 줄이 아직 도는 때다
    await pool.query(`UPDATE bts_issue_case SET closed_at = now(), resolution = 'DUPLICATE' WHERE issue_key = 'DM-1' AND service_id = $1`, [서비스]);
    await 짝넣기('DM-4', 'XQF-FN-001');
    expect(await 테스트수정처리(이은(), 이슈('DM-4'), 옮김, 답())).toEqual({ 요청들: [], 기록만: [] });
    expect(await 보낼것('DM-4')).toEqual([{ kind: 'COMMENT', payload: { body: '이 테스트는 DM-1 에서 이미 수정 중이에요' } }]);
  });

  it('한 건 실행으로 올린 이슈는 부모가 아니라 그 케이스가 실패한 한 건 실행을 고침 대상으로 삼는다', async () => {
    const 붙은 = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url, origin, rerun_of)
           VALUES ('XQF 한 건', 'xqf', 'FINISHED', 'qa', $1, 'XQF', '', 'https://qa.xqf.test', 'SINGLE', $2) RETURNING run_id`,
          [서비스, 실행],
        )
      ).rows[0]!.run_id,
    );
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at, file_path, param_schema, expected_schema, timeout_ms)
       VALUES ($1, 'XQF-FN-004', 'desktop', '검사', '{}', '{}', 'FAIL', 100, now(), 'tests/xqf/a.spec.ts', '{}', '{}', 300000)`,
      [붙은],
    );
    await 짝넣기('DM-5', 'XQF-FN-004');
    const { 요청들: [id] } = await 테스트수정처리(이은(), 이슈('DM-5'), 옮김, 답());
    expect((await 요청(id!)).params.testFix).toMatchObject({ cases: [{ runId: 붙은, tcId: 'XQF-FN-004', env: 'qa' }] });
  });

  it('PR 이 열리면 줄을 병합 기다림으로 두고 댓글 뒤에 필드를 넣는다 — 같은 PR 로 또 끝나면 한 번, 바퀴 전 요청은 댓글만', async () => {
    const 뿌리 = Number((await 줄('DM-1'))[0]!.request_id);
    const 고침 = { serviceId: 서비스, params: { testFix: { issueKey: 'DM-1' } } };
    const 주소 = 'https://github.com/o/r/pull/77';
    expect(await 테스트수정PR열림(고침, 뿌리, 주소, { testFix: { summary: '새 창 대신 지금 page.request 를 써요', reruns: 3 } })).toBe(true);
    expect(await 줄('DM-1')).toEqual([expect.objectContaining({ state: 'WAIT_MERGE', pr_url: 주소, summary: '새 창 대신 지금 page.request 를 써요' })]);
    expect((await 보낼것('DM-1')).slice(1)).toEqual([
      { kind: 'COMMENT', payload: { body: `테스트 수정 PR #77 을 열었어요 — 새 창 대신 지금 page.request 를 써요\n${주소}` } },
      { kind: 'FIELD', payload: { customFields: { qahub_test_fix_pr: 주소 } } },
    ]);
    expect(await 테스트수정PR열림(고침, 뿌리, 주소, { testFix: { summary: '다시', reruns: 3 } })).toBe(false);
    expect(await 테스트수정PR열림({ serviceId: 서비스, params: { prdApply: true } }, 뿌리, 주소, null)).toBe(false);
    expect(await 테스트수정PR열림({ serviceId: 서비스, params: { testFix: { issueKey: 'DM-9' } } }, 0, 'https://github.com/o/r/pull/78', null)).toBe(true);
    expect(await 보낼것('DM-9')).toEqual([{ kind: 'COMMENT', payload: { body: '테스트 수정 PR #78 을 열었어요\nhttps://github.com/o/r/pull/78' } }]);
  });

  it('이슈가 「테스트 수정」을 떠나면 그 이슈의 도는 줄을 놓는다', async () => {
    await 테스트수정처리(이은(), 이슈('DM-1', 'qa_review'), { from: 'fix', to: 'qa_review' }, 답());
    expect(await 줄('DM-1')).toEqual([expect.objectContaining({ state: 'GAVE_UP', reason: '사람이 이슈를 옮겼어요' })]);
  });
});

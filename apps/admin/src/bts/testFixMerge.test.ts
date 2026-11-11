// BTS 「테스트 수정」 자동 병합 판정 — 세 조건이 맞으면 반영을 bts 로 세우고, 걸리거나 반영이 막히면 「사람 확인이 필요해요」, 사람이 반영하면 PERSON (도메인/BTS 「테스트 수정 바퀴」 3)
// DATABASE_URL 이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { 부르기함수 } from './client.js';
import { 테스트수정PR열림 } from './testFix.js';
import { 반영한사람적기, 테스트수정병합판정 } from './testFixMerge.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('Issue Bunker 테스트 수정 자동 병합 판정', () => {
  let pool: Pool;
  let 프로젝트 = 0;
  let 서비스 = 0;
  /** 반영을 세우기 전에 다시 읽는 이슈 — 지금 상태만 준다 */
  const 답 = (상태 = 'fix', 코드 = 200): 부르기함수 => async () => (코드 === 200 ? { status: 200, json: { data: { currentStateKey: 상태 } } } : { status: 코드, json: null });
  const 판정 = (autoMerge: boolean, held: string[]) => ({ testFix: { summary: '기다리기를 고쳤어요', reruns: 3, autoMerge, held } });

  /** 끝난 고침 작성 하나와 그 PR 을 기다리는 바퀴 줄 하나 — 요청 번호를 돌려준다 */
  const 고침 = async (key: string, tcId: string, 결과: Record<string, unknown> = {}) => {
    const 주소 = `https://github.com/o/r/pull/${tcId.slice(-3)}`;
    const id = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, pr_url, result)
           VALUES ($1, 'AUTHOR', $2, 'bts', $3, 'DONE', $4, $5) RETURNING id`,
          [서비스, { prdApply: true, testFix: { issueKey: key, cases: [], note: '' } }, `Issue Bunker ${key}`, 주소, 결과],
        )
      ).rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, request_id, pr_url, state) VALUES ($1, $2, $3, $4, 'qa', $5, $6, 'WAIT_MERGE')`,
      [프로젝트, key, 서비스, tcId, id, 주소],
    );
    return { id, 주소 };
  };
  const 줄 = async (id: number) =>
    (await pool.query<{ merge: string | null; held: string[] }>('SELECT merge, held FROM bts_test_fix WHERE request_id = $1', [id])).rows[0]!;
  const 머지들 = async (id: number) =>
    (await pool.query<{ requested_by: string; requested_by_name: string }>(`SELECT requested_by, requested_by_name FROM authoring_request WHERE kind = 'MERGE' AND source_id = $1`, [id])).rows;
  const 댓글들 = async (key: string) =>
    (await pool.query<{ body: string }>(`SELECT payload->>'body' AS body FROM bts_outbox WHERE project_id = $1 AND issue_key = $2 AND kind = 'COMMENT' ORDER BY id`, [프로젝트, key])).rows.map((r) => r.body);

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQG 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQG', 'XQG 마켓', '#112233', '', 'xqg', $1) RETURNING id`, [프로젝트]))
        .rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.example.com', 'DM', 'qahub-xqg', 's', '{"TEST_FIX": "fix"}', '{}', 'xqg')`,
      [프로젝트],
    );
  });

  afterAll(async () => {
    // bts_test_fix · bts_outbox 는 service 와, bts_link 는 project 와 같이 지워진다. 남은 애플리케이션이 없는 project 는 트리거가 지운다
    await pool.query(`DELETE FROM authoring_request WHERE service_id = $1 AND kind = 'MERGE'`, [서비스]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.end();
  });

  it('세 조건이 맞으면 반영을 Issue Bunker 이름으로 세우고 AUTO 를 적는다 — 또 끝나도 한 번', async () => {
    const { id, 주소 } = await 고침('DM-1', 'XQG-FN-001');
    expect(await 테스트수정병합판정(id, 서비스, id, 주소, 판정(true, []), 답())).toBe('AUTO');
    expect(await 머지들(id)).toEqual([{ requested_by: 'bts', requested_by_name: 'Issue Bunker DM-1' }]);
    expect(await 줄(id)).toEqual({ merge: 'AUTO', held: [] });
    expect(await 테스트수정병합판정(id, 서비스, id, 주소, 판정(true, []), 답())).toBeNull();
    expect(await 머지들(id)).toHaveLength(1);
    expect(await 댓글들('DM-1')).toEqual([]);
  });

  it('걸리면 반영을 세우지 않고 까닭을 적어 「사람 확인이 필요해요」(같은 글은 한 번) — 반영이 끝나면 세운 사람대로 PERSON · AUTO', async () => {
    const { id, 주소 } = await 고침('DM-2', 'XQG-FN-002');
    expect(await 테스트수정병합판정(id, 서비스, id, 주소, 판정(false, ['EXPECTED_CHANGED', 'MUTATION_MISSED']))).toBe('PERSON');
    expect(await 테스트수정병합판정(id, 서비스, id, 주소, 판정(false, ['EXPECTED_CHANGED', 'MUTATION_MISSED']))).toBe('PERSON');
    expect(await 머지들(id)).toEqual([]);
    expect(await 줄(id)).toEqual({ merge: null, held: ['EXPECTED_CHANGED', 'MUTATION_MISSED'] });
    expect(await 댓글들('DM-2')).toEqual([`사람 확인이 필요해요 — 기대값이 바뀌었어요 · 일부러 고장 내 보기에서 못 잡은 고장이 있어요\n${주소}`]);
    const 손 = await pool.connect();
    try {
      await 반영한사람적기(손, id, 'xqg-admin');
      expect((await 줄(id)).merge).toBe('PERSON');
      await 반영한사람적기(손, id, 'bts');
      expect((await 줄(id)).merge).toBe('AUTO');
    } finally {
      손.release();
    }
  });

  it('판정 칸이 없으면 「재지 못함」 · 조건이 맞아도 반영이 막히면 그 까닭으로 사람에게 · 기다리는 줄이 없으면 아무것도 안 한다', async () => {
    const 앞판 = await 고침('DM-3', 'XQG-FN-003');
    expect(await 테스트수정병합판정(앞판.id, 서비스, 앞판.id, 앞판.주소, { testFix: { summary: '', reruns: 3 } })).toBe('PERSON');
    expect(await 댓글들('DM-3')).toEqual([`사람 확인이 필요해요 — 자동 병합 조건을 재지 못했어요\n${앞판.주소}`]);
    const 막힘 = await 고침('DM-4', 'XQG-FN-004', { heldUnknown: true });
    expect(await 테스트수정병합판정(막힘.id, 서비스, 막힘.id, 막힘.주소, 판정(true, []), 답())).toBe('PERSON');
    expect(await 머지들(막힘.id)).toEqual([]);
    expect(await 댓글들('DM-4')).toEqual([`사람 확인이 필요해요 — 보류 케이스가 몇 건인지 모르는 작성이에요\n${막힘.주소}`]);
    expect(await 테스트수정병합판정(막힘.id, 서비스, 막힘.id, 'https://github.com/o/r/pull/999', 판정(true, []), 답())).toBeNull();
  });

  it('병합 전 다시 돈 실행이 다른 PR 로 끝나면 줄이 그 PR 로 바뀌어 새 PR 로 판정한다', async () => {
    const { id } = await 고침('DM-5', 'XQG-FN-005');
    const 새주소 = 'https://github.com/o/r/pull/905';
    await pool.query('UPDATE authoring_request SET pr_url = $2 WHERE id = $1', [id, 새주소]);
    await 테스트수정PR열림({ serviceId: 서비스, params: { testFix: { issueKey: 'DM-5' } } }, id, 새주소, null);
    expect(await 테스트수정병합판정(id, 서비스, id, 새주소, 판정(true, []), 답())).toBe('AUTO');
    expect((await pool.query<{ pr_url: string }>('SELECT pr_url FROM bts_test_fix WHERE request_id = $1', [id])).rows[0]!.pr_url).toBe(새주소);
  });

  it('반영을 세우기 전에 이슈를 다시 읽는다 — 못 닿으면 그대로 두고(60초 점검이 다시 판정), 사람이 옮겼으면 줄을 놓는다', async () => {
    const { id, 주소 } = await 고침('DM-6', 'XQG-FN-006');
    expect(await 테스트수정병합판정(id, 서비스, id, 주소, 판정(true, []), 답('fix', 503))).toBeNull();
    expect(await 머지들(id)).toEqual([]);
    expect((await pool.query<{ state: string }>('SELECT state FROM bts_test_fix WHERE request_id = $1', [id])).rows[0]!.state).toBe('WAIT_MERGE');
    expect(await 테스트수정병합판정(id, 서비스, id, 주소, 판정(true, []), 답('qa_review'))).toBeNull();
    expect(await 머지들(id)).toEqual([]);
    expect((await pool.query<{ state: string; reason: string }>('SELECT state, reason FROM bts_test_fix WHERE request_id = $1', [id])).rows[0]).toEqual({
      state: 'GAVE_UP',
      reason: '사람이 이슈를 옮겼어요',
    });
  });
});

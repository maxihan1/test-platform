// BTS 닫기 사유 → QA Hub 가 할 일 — 사유 이름 짝 · 기록만 · 테스트 고침 요청 · 화면이 맞음 요청 · 한 번만 · PR 댓글 (도메인/BTS 「판정은 BTS 에서」)
// 사유찾기는 늘, 나머지는 DATABASE_URL 이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { BTS이슈, 부르기함수 } from './client.js';
import { 닫기처리, 사유찾기, 테스트고침댓글 } from './close.js';

const 해결짝 = { SCREEN_RIGHT: 'Works as designed', TEST_PROBLEM: 'Test issue', FLAKY: 'Flaky', ENV: 'Environment', DUPLICATE: '' };

describe('닫기 사유 이름 짝', () => {
  it('회사의 해결 상태 이름을 대소문자 · 앞뒤 빈칸 없이 단계로 찾는다 · 없거나 빈 짝이면 null', () => {
    expect(사유찾기(해결짝, ' flaky ')).toBe('FLAKY');
    expect(사유찾기(해결짝, 'Works as designed')).toBe('SCREEN_RIGHT');
    expect(사유찾기(해결짝, 'Done')).toBeNull();
    expect(사유찾기(해결짝, '')).toBeNull();
    expect(사유찾기(해결짝, null)).toBeNull();
  });
});

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('Issue Bunker 닫기 사유 처리', () => {
  let pool: Pool;
  let 프로젝트 = 0;
  let 서비스 = 0;
  let 실행 = 0;
  const 자리 = { baseUrl: 'https://bts.example.com', botKey: 'pat_xbc' };

  const 없음 = { 요청들: [], 기록만: [] };
  const 이슈 = (key: string, resolution: string | null): BTS이슈 => ({ key, state: 'closed', resolution, assigneeId: null, type: 'bug', summary: '', componentIds: [] });
  const 짝넣기 = (key: string, tcId: string) =>
    pool.query(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, first_run) VALUES ($1, $2, $3, $4, 'qa', $5)`, [프로젝트, key, 서비스, tcId, 실행]);
  const 짝 = async (key: string) =>
    (await pool.query<{ open: boolean; resolution: string | null }>('SELECT closed_at IS NULL AS open, resolution FROM bts_issue_case WHERE issue_key = $1 AND service_id = $2', [key, 서비스])).rows[0];
  const 요청 = async (id: number) =>
    (await pool.query<{ kind: string; params: Record<string, unknown>; requested_by: string; requested_by_name: string }>('SELECT kind, params, requested_by, requested_by_name FROM authoring_request WHERE id = $1', [id])).rows[0]!;
  const 요청수 = async () => Number((await pool.query<{ n: string }>('SELECT count(*) AS n FROM authoring_request WHERE service_id = $1', [서비스])).rows[0]!.n);

  const 이슈글: 부르기함수 = async (_자리, _method, 경로) =>
    경로.endsWith('/comments')
      ? { status: 200, json: { data: [{ body: '로그인 뒤 0.5초 기다려야 버튼이 뜹니다' }, { body: '테스트 쪽 기다리기 문제' }] } }
      : { status: 200, json: { data: { key: 'DM-2', summary: '로그인 실패', description: '버튼을 못 찾았다' } } };

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XBC 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XBC', 'XBC 마켓', '#112233', '', 'xbc', $1) RETURNING id`, [프로젝트]))
        .rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, $2, 'DM', $3, 's', '{}', $4, 'xbc')`,
      [프로젝트, 자리.baseUrl, 자리.botKey, JSON.stringify(해결짝)],
    );
    실행 = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url)
           VALUES ('XBC 실행', 'xbc', 'FINISHED', 'qa', $1, 'XBC', '', 'https://qa.xbc.test') RETURNING run_id`,
          [서비스],
        )
      ).rows[0]!.run_id,
    );
    for (const tcId of ['XBC-FN-001', 'XBC-FN-002', 'XBC-FN-003']) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at, file_path, param_schema, expected_schema, timeout_ms)
         VALUES ($1, $2, 'desktop', '검사', '{}', '{}', 'FAIL', 100, now(), 'tests/xbc/a.spec.ts', '{}', '{}', 300000)`,
        [실행, tcId],
      );
    }
    await pool.query(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 1, $2, 1, 'PERSON', 'xbc', 'xbc')`,
      [서비스, JSON.stringify([{ reqId: 'XBC-REQ-001', feature: '로그인', text: '로그인하면 홈으로 간다', basis: [], status: 'CONFIRMED' }])],
    );
    await pool.query(`INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, 'XBC-REQ-001', 'XBC-FN-002', '정상')`, [서비스]);
  });

  afterAll(async () => {
    // bts_outbox · bts_issue_case 는 service 와, bts_link 는 project 와 같이 지워진다. 남은 애플리케이션이 없는 project 는 트리거가 지운다
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.end();
  });

  it('흔들림 · 환경 문제는 짝 줄을 닫고 기록만 한다 · 사유가 없거나 모르는 이름이거나 닫힘 상태가 아니면 그대로 둔다', async () => {
    await 짝넣기('DM-1', 'XBC-FN-001');
    const 앞 = await 요청수();
    expect(await 닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-1', null))).toEqual(없음);
    expect(await 닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-1', 'Done'))).toEqual(없음);
    await pool.query(`UPDATE bts_link SET status_map = '{"CLOSED": "closed"}' WHERE project_id = $1`, [프로젝트]);
    expect(await 닫기처리({ projectId: 프로젝트, ...자리 }, { ...이슈('DM-1', 'Flaky'), state: 'open' })).toEqual(없음);
    expect(await 짝('DM-1')).toEqual({ open: true, resolution: null });
    expect(await 닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-1', 'flaky'))).toEqual(없음);
    expect(await 짝('DM-1')).toEqual({ open: false, resolution: 'FLAKY' });
    expect(await 요청수()).toBe(앞);
  });

  it('테스트 문제는 그 케이스만 고치는 반영 요청을 BTS 이름으로 세운다 — 이슈 글 · 댓글을 담고, 같은 알림이 또 와도 한 번', async () => {
    await 짝넣기('DM-2', 'XBC-FN-001');
    const { 요청들: [id] } = await 닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-2', 'Test issue'), 이슈글);
    const 행 = await 요청(id!);
    expect(행).toMatchObject({ kind: 'AUTHOR', requested_by: 'bts', requested_by_name: 'Issue Bunker DM-2' });
    expect(행.params).toMatchObject({
      prdApply: true,
      testFix: { issueKey: 'DM-2', cases: [{ runId: 실행, tcId: 'XBC-FN-001', env: 'qa' }] },
      decision: { count: 1 },
    });
    const 글 = (행.params.testFix as { note: string }).note;
    expect(글).toContain('버튼을 못 찾았다');
    expect(글).toContain('테스트 쪽 기다리기 문제');
    expect(await 짝('DM-2')).toEqual({ open: false, resolution: 'TEST_PROBLEM' });
    expect(await 닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-2', 'Test issue'), 이슈글)).toEqual(없음);
  });

  it('테스트 문제 글을 BTS 가 바빠 못 읽으면 던지고 짝 줄을 닫지 않는다 — 권한 · 없음(4xx)은 글 없이 간다', async () => {
    await 짝넣기('DM-3', 'XBC-FN-001');
    const 바쁨: 부르기함수 = async () => ({ status: 503, json: null });
    await expect(닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-3', 'Test issue'), 바쁨)).rejects.toThrow('DM-3');
    expect(await 짝('DM-3')).toEqual({ open: true, resolution: null });
    const 막힘: 부르기함수 = async () => ({ status: 403, json: null });
    const { 요청들: [id] } = await 닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-3', 'Test issue'), 막힘);
    expect((await 요청(id!)).params.testFix).toMatchObject({ issueKey: 'DM-3', note: expect.stringContaining('못 읽었다 — 403') });
    expect(await 짝('DM-3')).toEqual({ open: false, resolution: 'TEST_PROBLEM' });
  });

  it('화면이 맞음은 지금 「화면이 맞음」 다시 작성 요청을 세운다 — 덮는 요구가 판에 없는 케이스는 기록만', async () => {
    await 짝넣기('DM-4', 'XBC-FN-002');
    const { 요청들: [id] } = await 닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-4', 'Works as designed'));
    expect((await 요청(id!)).params).toMatchObject({
      prdApply: true,
      screenRight: [{ runId: 실행, tcId: 'XBC-FN-002', env: 'qa', reqIds: ['XBC-REQ-001'], byName: 'Issue Bunker DM-4' }],
    });
    await 짝넣기('DM-5', 'XBC-FN-003');
    expect(await 닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-5', 'Works as designed'))).toEqual({ 요청들: [], 기록만: ['XBC-FN-003 — NO_PRD_REQ'] });
    expect(await 짝('DM-5')).toEqual({ open: false, resolution: 'SCREEN_RIGHT' });
  });

  it('한 건 실행으로 올린 이슈는 부모 실행이 아니라 그 케이스가 실패한 한 건 실행을 대상으로 삼는다', async () => {
    const 붙은 = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url, origin, rerun_of)
           VALUES ('XBC 한 건', 'xbc', 'FINISHED', 'qa', $1, 'XBC', '', 'https://qa.xbc.test', 'SINGLE', $2) RETURNING run_id`,
          [서비스, 실행],
        )
      ).rows[0]!.run_id,
    );
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at, file_path, param_schema, expected_schema, timeout_ms)
       VALUES ($1, 'XBC-FN-004', 'desktop', '검사', '{}', '{}', 'FAIL', 100, now(), 'tests/xbc/a.spec.ts', '{}', '{}', 300000)`,
      [붙은],
    );
    await 짝넣기('DM-6', 'XBC-FN-004');
    const { 요청들: [id] } = await 닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-6', 'Test issue'), 이슈글);
    expect((await 요청(id!)).params.testFix).toMatchObject({ cases: [{ runId: 붙은, tcId: 'XBC-FN-004', env: 'qa' }] });
  });

  it('테스트 고침 요청이 PR 을 열면 그 이슈에 「테스트 고침 PR #N」 댓글을 보낼 줄에 넣는다 — 다른 요청 · 같은 PR 로 또 끝난 재실행은 안 넣는다', async () => {
    expect(await 테스트고침댓글({ serviceId: 서비스, params: { prdApply: true } }, 'https://github.com/o/r/pull/77')).toBe(false);
    expect(await 테스트고침댓글({ serviceId: 서비스, params: { testFix: { issueKey: 'DM-2' } } }, 'https://github.com/o/r/pull/77')).toBe(true);
    const 줄 = (await pool.query<{ kind: string; issue_key: string; payload: { body: string } }>('SELECT kind, issue_key, payload FROM bts_outbox WHERE project_id = $1 ORDER BY id DESC LIMIT 1', [프로젝트])).rows[0]!;
    expect(줄).toMatchObject({ kind: 'COMMENT', issue_key: 'DM-2' });
    expect(줄.payload.body).toContain('테스트 고침 PR #77');
    expect(await 테스트고침댓글({ serviceId: 서비스, params: { testFix: { issueKey: 'DM-2' } } }, 'https://github.com/o/r/pull/77')).toBe(false);
  });
});

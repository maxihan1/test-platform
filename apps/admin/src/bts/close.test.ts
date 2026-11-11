// BTS 닫기 사유 → QA Hub 가 할 일 — 사유 이름 짝 · 기록만(테스트 문제 포함) · 화면이 맞음 요청 · 한 번만 (도메인/BTS 「판정은 BTS 에서」)
// 사유찾기는 늘, 나머지는 DATABASE_URL 이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { BTS이슈 } from './client.js';
import { 닫기처리, 사유찾기 } from './close.js';

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
  const 자리 = { baseUrl: 'https://bts.example.com', 봇: 'qahub-xbc' };

  const 없음 = { 요청들: [], 기록만: [] };
  const 이슈 = (key: string, resolution: string | null): BTS이슈 => ({ key, state: 'closed', resolution, assigneeId: null, type: 'bug', summary: '', componentIds: [] });
  const 짝넣기 = (key: string, tcId: string) =>
    pool.query(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, first_run) VALUES ($1, $2, $3, $4, 'qa', $5)`, [프로젝트, key, 서비스, tcId, 실행]);
  const 짝 = async (key: string) =>
    (await pool.query<{ open: boolean; resolution: string | null }>('SELECT closed_at IS NULL AS open, resolution FROM bts_issue_case WHERE issue_key = $1 AND service_id = $2', [key, 서비스])).rows[0];
  const 요청 = async (id: number) =>
    (await pool.query<{ kind: string; params: Record<string, unknown>; requested_by: string; requested_by_name: string }>('SELECT kind, params, requested_by, requested_by_name FROM authoring_request WHERE id = $1', [id])).rows[0]!;
  const 요청수 = async () => Number((await pool.query<{ n: string }>('SELECT count(*) AS n FROM authoring_request WHERE service_id = $1', [서비스])).rows[0]!.n);

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XBC 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XBC', 'XBC 마켓', '#112233', '', 'xbc', $1) RETURNING id`, [프로젝트]))
        .rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, $2, 'DM', $3, 's', '{}', $4, 'xbc')`,
      [프로젝트, 자리.baseUrl, 자리.봇, JSON.stringify(해결짝)],
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

  it('테스트 문제는 짝 줄을 닫고 기록만 한다 — 고침을 세우지 않는다(고치려면 「테스트 수정」으로 옮긴다)', async () => {
    await 짝넣기('DM-2', 'XBC-FN-001');
    const 앞 = await 요청수();
    expect(await 닫기처리({ projectId: 프로젝트, ...자리 }, 이슈('DM-2', 'Test issue'))).toEqual(없음);
    expect(await 짝('DM-2')).toEqual({ open: false, resolution: 'TEST_PROBLEM' });
    expect(await 요청수()).toBe(앞);
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
});

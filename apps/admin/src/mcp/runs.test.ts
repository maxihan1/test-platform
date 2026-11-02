// MCP 실행 찾기(run_search)를 실제 DB 로 본다 — 케이스 번호 · 이슈 키로 찾기 · 남의 케이스 · 칸 없는 사람 · 10개 상한. DATABASE_URL이 있을 때만 돈다

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 사용자와해시, type 사용자 } from '../auth/store.js';
import { 실행찾기 } from './runs.js';

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xms-me', 'xms-part'];

describe.skipIf(연결 === undefined)('MCP 실행 찾기', () => {
  let 내앱 = 0;
  let 첫실행 = 0;
  let 나: 사용자;
  let 칸없는사람: 사용자;

  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);

  async function 치우기() {
    const 앱들 = (await q(`SELECT id FROM service WHERE prefix IN ('XMS', 'XMSB')`)).rows.map((r: { id: string }) => Number(r.id));
    await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [앱들]);
    await q('DELETE FROM test_run WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    // bts_issue_case 는 service 와, 프로젝트는 애플리케이션이 다 지워지면 트리거가 같이 지운다
    await q('DELETE FROM service WHERE id = ANY($1)', [앱들]);
  }

  const 실행 = async (시작: string) =>
    Number(
      (
        await q(
          `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url, started_at)
           VALUES ('XMS', 'xms', 'FINISHED', 'qa', $1, 'XMS', '', 'https://qa.xms.test', $2) RETURNING run_id`,
          [내앱, 시작],
        )
      ).rows[0].run_id,
    );

  const 항목 = async (runId: number, tcId: string, platform: string, status: string, 끝남: boolean) =>
    q(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, finished_at)
       VALUES ($1, $2, $3, 1, $2, 'xms/a.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', $4, $5)`,
      [runId, tcId, platform, status, 끝남 ? new Date() : null],
    );

  beforeAll(async () => {
    await 치우기();
    const 프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XMS 프로젝트') RETURNING id`)).rows[0].id);
    const 남프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XMS 다른 프로젝트') RETURNING id`)).rows[0].id);
    const 앱 = async (prefix: string, p: number) =>
      Number((await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#123456', '', $2, $3) RETURNING id`, [prefix, prefix.toLowerCase(), p])).rows[0].id);
    내앱 = await 앱('XMS', 프로젝트);
    await 앱('XMSB', 남프로젝트);
    for (const 이름 of 계정들) {
      await q(
        `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, is_active)
         VALUES ($1, $1, NULL, 'member', 'none', true, false, true)`,
        [이름],
      );
    }
    await q(
      `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ('xms-me', $1, 'read', 'read', 'read'), ('xms-part', $1, 'read', 'none', 'none')`,
      [프로젝트],
    );

    첫실행 = await 실행('2026-11-01T00:00:00Z');
    await 항목(첫실행, 'XMS-FN-001', 'desktop', 'FAIL', true);
    await 항목(첫실행, 'XMS-FN-001', 'mobile', 'NA', false);
    await 항목(첫실행, 'XMS-FN-002', 'desktop', 'PASS', true);
    await q(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, first_run) VALUES ($1, 'XMSQ-12', $2, 'XMS-FN-001', 'qa', $3)`, [프로젝트, 내앱, 첫실행]);
    // 11번 돈 케이스 — 늦은 것부터 10개만 싣는다
    for (let i = 0; i < 11; i++) await 항목(await 실행(`2026-11-02T00:00:${String(i).padStart(2, '0')}Z`), 'XMS-FN-003', 'desktop', 'PASS', true);

    나 = (await 사용자와해시('xms-me'))!.user;
    칸없는사람 = (await 사용자와해시('xms-part'))!.user;
  });

  afterAll(치우기);

  it('케이스 번호 · 이슈 키로 그 케이스가 든 실행과 그 케이스 항목만 준다', async () => {
    const 기대 = {
      runs: [
        {
          runId: 첫실행,
          title: 'XMS',
          status: 'FINISHED',
          env: 'qa',
          items: [
            { tcId: 'XMS-FN-001', platform: 'desktop', attempt: 1, status: 'FAIL' },
            { tcId: 'XMS-FN-001', platform: 'mobile', attempt: 1, status: 'NA', finishedAt: null },
          ],
        },
      ],
    };
    expect(await 실행찾기(나, 'XMS', { tcId: 'XMS-FN-001' })).toMatchObject({ ok: true, data: 기대 });
    expect(await 실행찾기(나, 'XMS', { issueKey: 'XMSQ-12' })).toMatchObject({ ok: true, data: 기대 });
  });

  it('11번 돈 케이스는 늦은 것부터 10개와 truncated', async () => {
    const 답 = await 실행찾기(나, 'XMS', { tcId: 'XMS-FN-003' });
    const data = (답 as { data: { runs: { startedAt: Date }[]; truncated?: boolean } }).data;
    expect(data.runs).toHaveLength(10);
    expect(data.runs[0]!.startedAt.toISOString()).toBe('2026-11-02T00:00:10.000Z');
    expect(data.truncated).toBe(true);
  });

  it('비면 까닭, 남의 케이스 번호 · 칸 없는 사람은 FORBIDDEN, 찾을 칸이 없으면 BAD_INPUT', async () => {
    expect(await 실행찾기(나, 'XMS', { issueKey: 'XMSQ-99' })).toEqual({ ok: true, data: { runs: [], empty: 'XMSQ-99 에 짝 지은 XMS 케이스가 없다' } });
    expect(await 실행찾기(나, 'XMS', { tcId: 'XMS-FN-404' })).toEqual({ ok: true, data: { runs: [], empty: 'XMS-FN-404 가 든 실행이 없다' } });
    expect(await 실행찾기(나, 'XMS', { tcId: 'XMSB-FN-001' })).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    expect(await 실행찾기(나, 'XMSB', { tcId: 'XMSB-FN-001' })).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    expect(await 실행찾기(칸없는사람, 'XMS', { tcId: 'XMS-FN-001' })).toMatchObject({ ok: false, error: 'FORBIDDEN', detail: 'runs:read' });
    expect(await 실행찾기(나, 'XMS', {})).toMatchObject({ ok: false, error: 'BAD_INPUT' });
  });
});

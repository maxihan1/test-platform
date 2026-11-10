// Scout 도구 다섯(run_list · e2e_result · compat_result · perf_result · issue_list)과 run_result 의 비밀값 가림을 실제 DB 로 본다. BTS 는 가짜다. DATABASE_URL이 있을 때만 돈다

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 사용자와해시, type 사용자 } from '../auth/store.js';
import type { 부르기함수 } from '../bts/client.js';
import { 실행보기 } from './runs.js';
import { E2E결과, 성능결과, 실행목록, 호환성결과보기 } from './scout.js';
import { 최근이슈 } from './tools.js';

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xmt-me', 'xmt-part'];
const 비밀 = 'p@ss-xmt-77';

describe.skipIf(연결 === undefined)('MCP Scout 도구', () => {
  let 프로젝트 = 0;
  let 남프로젝트 = 0;
  let 내앱 = 0;
  let 남앱 = 0;
  const 실행번호 = { ui: 0, e2e: 0, compat: 0, 남ui: 0, 부하: 0, 기기: 0 };
  let 나: 사용자;
  let 칸없는사람: 사용자;
  const BTS받은것: string[] = [];
  const 부르기: 부르기함수 = async (_자리, _method, 경로) => {
    BTS받은것.push(경로);
    const 이슈 = (i: number) => ({ key: `XMTQ-${String(i)}`, summary: `이슈 ${String(i)}`, currentStateKey: i === 1 ? 'closed' : 'open', createdAt: `2026-11-0${String(i)}T00:00:00Z`, priority: 3 });
    return { status: 200, json: { content: [이슈(2), 이슈(1)], totalElements: 61 } };
  };

  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);
  const 번호 = (r: { rows: Record<string, unknown>[] }, 칸 = 'run_id') => Number(r.rows[0]![칸]);

  async function 치우기() {
    const 앱들 = (await q(`SELECT id FROM service WHERE prefix IN ('XMT', 'XMTB')`)).rows.map((r: { id: string }) => Number(r.id));
    const 실행들 = 'SELECT run_id FROM test_run WHERE service_id = ANY($1)';
    await q(`DELETE FROM compat_screen WHERE run_id IN (${실행들})`, [앱들]);
    await q(`DELETE FROM compat_run_case WHERE run_id IN (${실행들})`, [앱들]);
    await q(`DELETE FROM compat_run_device WHERE run_id IN (${실행들})`, [앱들]);
    await q(`DELETE FROM scenario_run_part WHERE run_id IN (${실행들})`, [앱들]);
    await q(`DELETE FROM run_item WHERE run_id IN (${실행들})`, [앱들]);
    await q('DELETE FROM test_run WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM compat_set WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1))', [앱들]);
    await q('DELETE FROM scenario WHERE service_id = ANY($1)', [앱들]);
    // 1초 숫자는 perf_run 과 같이 지워진다
    await q('DELETE FROM perf_run WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM perf_scenario WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    // bts_link 는 project 와, project 는 애플리케이션이 다 지워지면 트리거가 같이 지운다
    await q('DELETE FROM service WHERE id = ANY($1)', [앱들]);
  }

  const 케이스실행 = async (앱: number, 시작: string) =>
    번호(
      await q(
        `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url, started_at, finished_at, kind)
         VALUES ('XMT 회귀', 'xmt', 'FINISHED', 'qa', $1, 'XMT', '', 'https://qa.xmt.test', $2, $2, 'UI') RETURNING run_id`,
        [앱, 시작],
      ),
    );

  beforeAll(async () => {
    await 치우기();
    프로젝트 = 번호(await q(`INSERT INTO project (name) VALUES ('XMT 프로젝트') RETURNING id`), 'id');
    남프로젝트 = 번호(await q(`INSERT INTO project (name) VALUES ('XMT 다른 프로젝트') RETURNING id`), 'id');
    const 앱 = async (prefix: string, p: number) =>
      번호(await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#123456', '', $2, $3) RETURNING id`, [prefix, prefix.toLowerCase(), p]), 'id');
    내앱 = await 앱('XMT', 프로젝트);
    남앱 = await 앱('XMTB', 남프로젝트);
    for (const 이름 of 계정들) {
      await q(
        `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, is_active)
         VALUES ($1, $1, NULL, 'member', 'none', true, false, true)`,
        [이름],
      );
    }
    await q(
      `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ('xmt-me', $1, 'read', 'read', 'read'), ('xmt-part', $1, 'read', 'none', 'read')`,
      [프로젝트],
    );
    await q(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.xmt.test', 'XMTQ', 'xmt-bot', 's', '{}', '{}', 'xmt')`,
      [프로젝트],
    );

    // 케이스 실행 — 이름으로 비밀인 칸과 비밀 꼬리표 칸 둘 다 실패 항목에 든다
    실행번호.ui = await 케이스실행(내앱, '2026-11-01T00:00:01Z');
    await q(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, error, finished_at)
       VALUES ($1, 'XMT-001', 'desktop', 1, '로그인', 'xmt/a.spec.ts', 300000, '[]', $2, '{}', $3, '{}', 'FAIL', $4, now())`,
      [
        실행번호.ui,
        JSON.stringify({ password: 비밀, 핀: '4321', 이름: 'kim' }),
        JSON.stringify({ type: 'object', properties: { 핀: { type: 'string', secret: true } } }),
        JSON.stringify({ message: `비밀번호 ${비밀} 로 로그인하지 못했다` }),
      ],
    );
    실행번호.남ui = await 케이스실행(남앱, '2026-11-01T00:00:09Z');

    // E2E 실행 — 케이스 부품 하나(실패) · 대기 부품 하나
    const 시나리오 = 번호(await q(`INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XMT 시나리오', 'xmt') RETURNING id`, [내앱]), 'id');
    await q(
      `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name) VALUES ($1, 1, 'desktop', $2, 'xmt', 'XMT')`,
      [시나리오, JSON.stringify([{ kind: 'case', tcId: 'XMT-001', params: {}, expected: {}, skipSteps: [] }, { kind: 'wait', ms: 2000 }])],
    );
    실행번호.e2e = 번호(
      await q(
        `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, scenario_id, scenario_version, started_at, finished_at)
         VALUES ('XMT 시나리오', 'xmt', 'qa', 'FINISHED', $1, 'XMT', '', '', 'SCENARIO', $2, 1, '2026-11-01T00:00:02Z', '2026-11-01T00:00:02Z') RETURNING run_id`,
        [내앱, 시나리오],
      ),
    );
    await q(
      `INSERT INTO scenario_run_part (run_id, seq, kind, tc_id, tc_name, part, file_path, param_schema, expected_schema, timeout_ms, precondition, status, error, finished_at)
       VALUES ($1, 1, 'case', 'XMT-001', '로그인', $2, 'xmt/a.spec.ts', '{}', '{}', 300000, '[]', 'FAIL', $3, now())`,
      [실행번호.e2e, JSON.stringify({ kind: 'case', tcId: 'XMT-001', params: { password: 비밀 }, expected: {}, skipSteps: [] }), JSON.stringify({ message: `비밀번호 ${비밀} 가 틀렸다` })],
    );
    await q(`INSERT INTO scenario_run_part (run_id, seq, kind, part, status, finished_at) VALUES ($1, 2, 'wait', $2, 'NA', now())`, [실행번호.e2e, JSON.stringify({ kind: 'wait', ms: 2000 })]);

    // 호환성 실행 — 의심 하나가 든 화면 한 장
    const 세트 = 번호(await q(`INSERT INTO compat_set (service_id, name, devices, created_by) VALUES ($1, 'XMT 세트', '[]', 'xmt') RETURNING id`, [내앱]), 'id');
    실행번호.compat = 번호(
      await q(
        `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, compat_set_id, started_at, finished_at)
         VALUES ('XMT 세트', 'xmt', 'qa', 'FINISHED', $1, 'XMT', '', '', 'COMPAT', $2, '2026-11-01T00:00:03Z', '2026-11-01T00:00:03Z') RETURNING run_id`,
        [내앱, 세트],
      ),
    );
    await q(`INSERT INTO compat_run_device (run_id, seq, serial, model, name, fold, state) VALUES ($1, 1, 'R5', 'SM-F946N', 'Fold5', 'OPEN', 'DONE')`, [실행번호.compat]);
    const 케이스줄 = 번호(
      await q(
        `INSERT INTO compat_run_case (run_id, seq, tc_id, tc_name, picked, file_path, timeout_ms, check_state, started_at, finished_at)
         VALUES ($1, 1, 'XMT-001', '로그인', 'AUTO', 'x', 1000, 'done', now(), now()) RETURNING id`,
        [실행번호.compat],
      ),
      'id',
    );
    await q(
      `INSERT INTO compat_screen (case_run_id, run_id, seq, screen_key, at, before, status, issues) VALUES ($1, $2, 1, 'app:.MainActivity', now(), 'click', 'done', $3)`,
      [케이스줄, 실행번호.compat, JSON.stringify([{ kind: 'CLIPPED', box: [0, 0, 1, 1], note: '가'.repeat(600) }])],
    );

    // 성능 실행 — 부하(기준 하나 넘음 · AI 분석) · 기기(디바이스 하나)
    const 부하시나리오 = 번호(await q(`INSERT INTO perf_scenario (service_id, name, created_by) VALUES ($1, 'XMT 둘러보기', 'xmt') RETURNING id`, [내앱]), 'id');
    실행번호.부하 = 번호(
      await q(
        `INSERT INTO perf_run (kind, service_id, scenario_id, scenario_version, test_type, env, base_url, config, targets, ai, status, verdict, origin, started_at, finished_at, p95_ms, error_rate)
         VALUES ('LOAD', $1, $4, 1, 'LOAD', 'qa', '', '{}', $2, $3, 'DONE', 'FAIL', 'MANUAL', '2026-11-01T00:00:05Z', '2026-11-01T00:10:05Z', 900, 0.5) RETURNING id`,
        [
          내앱,
          JSON.stringify([{ metric: 'P95', op: '<=', value: 500, measured: 900, verdict: 'FAIL' }, { metric: 'TPS', op: '>=', value: 10, measured: 20, verdict: 'PASS' }, { metric: 'ERROR_RATE', op: '<=', value: 1 }]),
          JSON.stringify({ title: '응답이 느리다', items: ['나'.repeat(3000)] }),
          부하시나리오,
        ],
      ),
      'id',
    );
    실행번호.기기 = 번호(
      await q(
        `INSERT INTO perf_run (kind, service_id, env, base_url, config, targets, status, verdict, origin, started_at, finished_at)
         VALUES ('DEVICE', $1, 'qa', '', $2, $3, 'DONE', 'PASS', 'MANUAL', '2026-11-01T00:00:04Z', '2026-11-01T00:05:04Z') RETURNING id`,
        [내앱, JSON.stringify({ devices: [{ serial: 'p1', where: 'LOCAL', model: 'Galaxy S23', launchMs: 800 }] }), JSON.stringify([{ scope: 'p1', metric: 'MAX_MEM', verdict: 'PASS' }])],
      ),
      'id',
    );
    await q(`INSERT INTO perf_device_metric (run_id, serial, device, sec, fps, cpu, mem_mb) VALUES ($1, 'p1', 'Galaxy S23', 1, 60, 20, 300), ($1, 'p1', 'Galaxy S23', 2, 50, 30, 400)`, [실행번호.기기]);

    나 = (await 사용자와해시('xmt-me'))!.user;
    칸없는사람 = (await 사용자와해시('xmt-part'))!.user;
  });

  afterAll(치우기);

  it('run_list — 일곱 종류를 시작 시각 늦은 것부터 섞고, 남의 프로젝트 실행은 없다', async () => {
    const 답 = await 실행목록(나, 프로젝트);
    expect(답).toMatchObject({
      ok: true,
      data: {
        runs: [
          { kind: 'PERF_LOAD', runId: 실행번호.부하, serviceName: 'XMT', status: 'DONE', finishedAt: '2026-11-01T00:10:05.000Z', summary: { verdict: 'FAIL', measures: { p95Ms: 900 } } },
          { kind: 'PERF_DEVICE', runId: 실행번호.기기, summary: { verdict: 'PASS' } },
          { kind: 'COMPAT', runId: 실행번호.compat, summary: { setName: 'XMT 세트', pending: 1 } },
          { kind: 'SCENARIO', runId: 실행번호.e2e, summary: { verdict: 'FAIL', partCount: 2, stoppedAt: 1 } },
          { kind: 'UI', runId: 실행번호.ui, title: 'XMT 회귀', summary: { fail: 1 } },
        ],
      },
    });
    expect((답 as { data: { runs: unknown[]; truncated?: boolean } }).data.runs).toHaveLength(5);
    expect((답 as { data: { truncated?: boolean } }).data.truncated).toBeUndefined();
  });

  it('run_list — kind 로 한 종류만 고른다', async () => {
    expect(await 실행목록(나, 프로젝트, 'PERF_DEVICE')).toMatchObject({ ok: true, data: { runs: [{ runId: 실행번호.기기 }] } });
    expect(await 실행목록(나, 프로젝트, 'FN')).toEqual({ ok: true, data: { runs: [] } });
  });

  it('칸이 없거나 남의 프로젝트 · 실행이면 FORBIDDEN, 종류가 다른 번호는 NOT_FOUND', async () => {
    expect(await 실행목록(칸없는사람, 프로젝트)).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    expect(await 실행목록(나, 남프로젝트)).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    expect(await E2E결과(칸없는사람, 실행번호.e2e)).toMatchObject({ ok: false, error: 'FORBIDDEN', detail: 'runs:read' });
    expect(await 호환성결과보기(칸없는사람, 실행번호.compat)).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    expect(await 성능결과(칸없는사람, 실행번호.부하)).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    expect(await E2E결과(나, 실행번호.남ui)).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    expect(await E2E결과(나, 실행번호.ui)).toMatchObject({ ok: false, error: 'NOT_FOUND' });
    expect(await 호환성결과보기(나, 실행번호.ui)).toMatchObject({ ok: false, error: 'NOT_FOUND' });
    expect(await 성능결과(나, 999_999_999)).toMatchObject({ ok: false, error: 'NOT_FOUND' });
  });

  it('e2e_result — 부품마다 이름 · 판정 · 실패 한 줄만 싣는다', async () => {
    const 답 = await E2E결과(나, 실행번호.e2e);
    expect(답).toMatchObject({
      ok: true,
      data: {
        runId: 실행번호.e2e,
        title: 'XMT 시나리오',
        status: 'FINISHED',
        parts: [
          { seq: 1, kind: 'case', tcId: 'XMT-001', name: '로그인', status: 'FAIL' },
          { seq: 2, kind: 'wait', tcId: null, name: '2초 기다림', status: 'NA' },
        ],
      },
    });
    const 부품 = (답 as { data: { parts: Record<string, unknown>[] } }).data.parts[0]!;
    expect(Object.keys(부품).sort()).toEqual(['durationMs', 'failure', 'kind', 'name', 'seq', 'status', 'tcId']);
  });

  it('compat_result — 칸 · 카드를 싣고 의심 설명은 500자에서 자른다', async () => {
    expect(await 호환성결과보기(나, 실행번호.compat)).toMatchObject({
      ok: true,
      data: {
        runId: 실행번호.compat,
        title: 'XMT 세트',
        devices: [{ seq: 1, name: 'Fold5', fold: 'OPEN', state: 'DONE', skipReason: null }],
        rows: [{ key: 'app:.MainActivity', cells: [{ seq: 1, value: 'PENDING' }] }],
        cards: [{ key: 'app:.MainActivity', seq: 1, issues: [{ kind: 'CLIPPED', note: `${'가'.repeat(500)}…(이하 생략)` }], verdict: null }],
      },
    });
  });

  it('perf_result — 부하는 기준 넘은 목표만 · AI 글은 2,000자, 기기는 디바이스마다 요약과 판정', async () => {
    const 부하 = await 성능결과(나, 실행번호.부하);
    expect(부하).toMatchObject({ ok: true, data: { kind: 'LOAD', verdict: 'FAIL', targets: [{ metric: 'P95', verdict: 'FAIL' }], link: `#/perf/runs/${String(실행번호.부하)}` } });
    const 부하몸 = (부하 as { data: { targets: unknown[]; ai: string } }).data;
    expect(부하몸.targets).toHaveLength(1);
    expect(부하몸.ai.endsWith('…(이하 생략)')).toBe(true);
    expect(부하몸.ai.length).toBe(2000 + '…(이하 생략)'.length);
    expect(await 성능결과(나, 실행번호.기기)).toMatchObject({
      ok: true,
      data: { kind: 'DEVICE', devices: [{ serial: 'p1', model: 'Galaxy S23', verdict: 'PASS', summary: expect.any(Object) as unknown }] },
    });
  });

  it('비밀값 — run_result · 새 도구 넷은 비밀 칸을 ******** 로, 오류 글 속 비밀도 가려 낸다', async () => {
    const 결과 = await 실행보기(나, 실행번호.ui);
    expect(결과).toMatchObject({ ok: true, data: { items: [{ tcId: 'XMT-001', params: { password: '********', 핀: '********', 이름: 'kim' } }] } });
    const 글 = JSON.stringify([결과, await E2E결과(나, 실행번호.e2e), await 실행목록(나, 프로젝트), await 호환성결과보기(나, 실행번호.compat), await 성능결과(나, 실행번호.부하)]);
    expect(글).not.toContain(비밀);
    expect(글).not.toContain('4321');
  });

  it('issue_list — 이은 BTS 프로젝트 이슈를 만든 시각 늦은 것부터 30줄씩 부른다', async () => {
    expect(await 최근이슈(나, null, 프로젝트, 1, 부르기)).toEqual({
      ok: true,
      data: {
        items: [
          { key: 'XMTQ-2', title: '이슈 2', status: 'open', createdAt: '2026-11-02T00:00:00Z' },
          { key: 'XMTQ-1', title: '이슈 1', status: 'closed', createdAt: '2026-11-01T00:00:00Z' },
        ],
        truncated: true,
      },
    });
    expect(BTS받은것.at(-1)).toBe('/api/v1/issues?projectKey=XMTQ&page=1&size=30');
    expect(await 최근이슈(나, null, 남프로젝트, 0, 부르기)).toMatchObject({ ok: false, error: 'FORBIDDEN' });
  });
});

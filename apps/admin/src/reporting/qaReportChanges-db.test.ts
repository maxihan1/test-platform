// QA 리포트 변경 사항 — 실행 때 테스트 버전 박제 · 제품 · 요구사항 · 테스트 · 확인한 케이스 (DB 접속이 있을 때만 돈다)
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRun } from '../execution/store.js';
import { 변경사항을센다 } from './qaReportChanges.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('QA 리포트 변경 사항', { timeout: 60_000 }, () => {
  let pool: Pool;
  let 프로젝트 = 0;
  let 앱 = 0;
  let 폴더 = '';
  const 케이스들 = ['XQC-FN-001', 'XQC-FN-002', 'XQC-FN-004', 'XQC-FN-005'];
  const 옛환경 = { tests: process.env.PLATFORM_TESTS_DIR, git: process.env.PLATFORM_TESTS_GIT_DIR };
  const 실행 = { 앞: 0, 이번: 0 };

  const 실행만들기 = (build: string, 시작: string) =>
    pool
      .query<{ run_id: string }>(
        `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, triggered_by_name, env, base_url, status, service_id, kind, origin, build_no, started_at, finished_at)
         VALUES ('XQC 실행', 'XQC 웹', '', 'xqc', 'xqc', 'qa', 'https://qa.xqc.test', 'FINISHED', $1, 'FN', 'MANUAL', $2, $3, $3::timestamptz + interval '1 hour') RETURNING run_id`,
        [앱, build, 시작],
      )
      .then((r) => Number(r.rows[0]!.run_id));
  const 항목 = (runId: number, tcId: string, o: { sha: string | null; commit?: string; expected?: object; status?: string }) =>
    pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, tests_commit, case_sha256)
       VALUES ($1, $2, 'desktop', $2 || ' 이름', 'xqc/x.spec.ts', 5000, '[]', '{}', $3, '{}', '{}', $4, $5, $6)`,
      [runId, tcId, JSON.stringify(o.expected ?? {}), o.status ?? 'PASS', o.commit ?? null, o.sha],
    );
  const 요청 = (o: { kind: string; source?: number; params?: object; result?: object; finished?: string; prUrl?: string }) =>
    pool
      .query<{ id: string }>(
        `INSERT INTO authoring_request (service_id, kind, source_id, params, result, requested_by, requested_by_name, status, finished_at, pr_url)
         VALUES ($1, $2, $3, $4, $5, 'xqc', 'xqc', 'DONE', $6, $7) RETURNING id`,
        [앱, o.kind, o.source ?? null, JSON.stringify(o.params ?? {}), o.result === undefined ? null : JSON.stringify(o.result), o.finished ?? null, o.prUrl ?? null],
      )
      .then((r) => Number(r.rows[0]!.id));

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQC 프로젝트') RETURNING id`)).rows[0]!.id);
    앱 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQC', 'XQC 웹', '#3A5FCD', '', 'xqc', $1) RETURNING id`, [프로젝트])).rows[0]!.id,
    );
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'https://qa.xqc.test')`, [앱]);
    for (const tc of 케이스들) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $1 || ' 이름', '["desktop"]', '[]', 'xqc/' || $1 || '.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
        [tc],
      );
    }
    // 앞 빌드 1.0 — 003 은 이번 빌드 전에 지워졌다(test_case 에 없다)
    실행.앞 = await 실행만들기('1.0', '2026-11-01T01:00:00Z');
    await 항목(실행.앞, 'XQC-FN-001', { sha: 'a', commit: 'c1', expected: { 문구: '환영합니다' } });
    await 항목(실행.앞, 'XQC-FN-002', { sha: 'b', commit: 'c1' });
    await 항목(실행.앞, 'XQC-FN-003', { sha: 'c', commit: 'c1' });
    await 항목(실행.앞, 'XQC-FN-005', { sha: 'e', commit: 'c1' });
    // 이번 빌드 1.1 — 001 기대 결과 변경 · 002 파일 변경 · 004 신규 · 005 는 안 돌았지만 살아 있어 삭제가 아니다
    실행.이번 = await 실행만들기('1.1', '2026-11-05T01:00:00Z');
    await 항목(실행.이번, 'XQC-FN-001', { sha: 'a', commit: 'c2', expected: { 문구: '반갑습니다' } });
    await 항목(실행.이번, 'XQC-FN-002', { sha: 'b2', commit: 'c2', status: 'FAIL' });
    await 항목(실행.이번, 'XQC-FN-004', { sha: 'd', commit: 'c2' });
    await pool.query(`INSERT INTO run_case_bug (run_id, tc_id, marked_by, marked_by_name) VALUES ($1, 'XQC-FN-002', 'xqc-b', '판정한 사람')`, [실행.이번]);

    // PRD 판 — 앞 빌드 때 1판, 이번 빌드 때 2판
    for (const [v, at, items] of [
      [1, '2026-10-30T00:00:00Z', [{ reqId: 'XQC-REQ-001', text: '로그인한다' }, { reqId: 'XQC-REQ-002', text: '로그아웃한다' }]],
      [2, '2026-11-03T00:00:00Z', [{ reqId: 'XQC-REQ-001', text: '두 단계로 로그인한다' }, { reqId: 'XQC-REQ-003', text: '비밀번호를 바꾼다' }]],
    ] as const) {
      const 꼴 = items.map((x) => ({ ...x, feature: '계정', basis: [], status: 'CONFIRMED' }));
      await pool.query(
        `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name, saved_at) VALUES ($1, $2, $3, 3, 'PERSON', 'xqc', 'xqc', $4)`,
        [앱, v, JSON.stringify(꼴), at],
      );
    }

    // 까닭 — 001 은 케이스 고치기, 002 는 테스트 수정 바퀴, 004 는 PRD 반영 작성. 앞 빌드 전에 병합된 것은 안 본다
    const 옛 = await 요청({ kind: 'AUTHOR', result: { cases: [{ tcId: 'XQC-FN-001' }] } });
    await 요청({ kind: 'MERGE', source: 옛, finished: '2026-10-20T00:00:00Z' });
    const 고치기 = await 요청({ kind: 'EDIT', params: { edits: [{ tcId: 'XQC-FN-001', expected: { 문구: '반갑습니다' } }] }, prUrl: 'https://github.com/o/t/pull/11' });
    await 요청({ kind: 'MERGE', source: 고치기, finished: '2026-11-04T00:00:00Z' });
    const 수정 = await 요청({ kind: 'AUTHOR', result: { cases: [{ tcId: 'XQC-FN-002' }] } });
    const 수정다시 = await 요청({ kind: 'RERUN', source: 수정, result: { cases: [{ tcId: 'XQC-FN-002' }] }, prUrl: 'https://github.com/o/t/pull/12' });
    await 요청({ kind: 'MERGE', source: 수정다시, finished: '2026-11-04T01:00:00Z' });
    await pool.query(`INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, request_id) VALUES ($1, 'XQC-9', $2, 'XQC-FN-002', 'qa', $3)`, [프로젝트, 앱, 수정]);
    const 반영 = await 요청({ kind: 'AUTHOR', params: { prdApply: true }, result: { cases: [{ tcId: 'XQC-FN-004' }] } });
    await 요청({ kind: 'MERGE', source: 반영, finished: '2026-11-02T00:00:00Z' });

    // Issue Bunker — 이번 빌드 실행을 건 배포와 맡은 이슈. 서버 BTS_URLS 밖 주소라 Bunker 는 못 읽고 노트 사건의 제목을 쓴다
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bunker.xqc.invalid', 'XQC', 's', '{}', '{}', 'xqc')`,
      [프로젝트],
    );
    const 배포 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO bts_deploy (project_id, build_no, service_ids, run_ids) VALUES ($1, 'abc1234-1105', $2, $3) RETURNING id`, [프로젝트, [앱], [실행.이번]])).rows[0]!
        .id,
    );
    await pool.query(`INSERT INTO bts_claim (project_id, issue_key, deploy_id, issue_type) VALUES ($1, 'XQC-1', $2, 'TASK')`, [프로젝트, 배포]);
    await pool.query(`INSERT INTO project_note_event (project_id, kind, payload) VALUES ($1, 'ISSUE_OPEN', $2), ($1, 'PR_MERGED', $3), ($1, 'PR_MERGED', $3)`, [
      프로젝트,
      JSON.stringify({ issueKey: 'XQC-1', type: 'TASK', summary: '로그인 두 단계' }),
      JSON.stringify({ issueKey: 'XQC-1', prNumber: 7, prUrl: 'https://github.com/o/app/pull/7', prTitle: '두 단계 로그인' }),
    ]);

    // 실행 만들 때 박제 — 가짜 테스트 폴더와 .git
    폴더 = await mkdtemp(join(tmpdir(), 'xqc-'));
    await mkdir(join(폴더, 'tests/xqc'), { recursive: true });
    await mkdir(join(폴더, 'git'));
    await writeFile(join(폴더, 'tests/xqc/XQC-FN-001.spec.ts'), 'export const spec = 1;\n');
    await writeFile(join(폴더, 'git/HEAD'), 'f'.repeat(40));
    process.env.PLATFORM_TESTS_DIR = join(폴더, 'tests');
    process.env.PLATFORM_TESTS_GIT_DIR = join(폴더, 'git');
  });

  afterAll(async () => {
    process.env.PLATFORM_TESTS_DIR = 옛환경.tests;
    process.env.PLATFORM_TESTS_GIT_DIR = 옛환경.git;
    if (옛환경.tests === undefined) delete process.env.PLATFORM_TESTS_DIR;
    if (옛환경.git === undefined) delete process.env.PLATFORM_TESTS_GIT_DIR;
    await rm(폴더, { recursive: true, force: true });
    await pool.query('DELETE FROM bts_test_fix WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1 AND kind = $2', [앱, 'MERGE']);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1 AND kind = $2', [앱, 'RERUN']);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM prd_version WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM run_case_bug WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [앱]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM service WHERE id = $1', [앱]);
    await pool.query('DELETE FROM project WHERE id = $1', [프로젝트]);
  });

  const 센다 = (previousBuildNo: string | null) =>
    변경사항을센다(pool, {
      serviceId: 앱,
      env: 'qa',
      runIds: [실행.이번],
      firstStartedAt: new Date('2026-11-05T01:00:00Z'),
      lastStartedAt: new Date('2026-11-05T01:00:00Z'),
      previousBuildNo,
    });

  it('실행을 만들면 항목에 테스트 커밋과 케이스 파일 지문이 박힌다', async () => {
    const { runId } = await createRun({ origin: 'MANUAL', triggeredBy: 'xqc', triggeredByName: 'xqc', notifySlack: false, env: 'qa', items: [{ tcId: 'XQC-FN-001', platforms: ['desktop'], params: {}, expected: {} }] });
    const 줄 = (await pool.query<{ tests_commit: string | null; case_sha256: string | null }>('SELECT tests_commit, case_sha256 FROM run_item WHERE run_id = $1', [runId])).rows[0]!;
    expect(줄.tests_commit).toBe('f'.repeat(40));
    expect(줄.case_sha256).toMatch(/^[0-9a-f]{64}$/);
    await pool.query('DELETE FROM run_item WHERE run_id = $1', [runId]);
    await pool.query('DELETE FROM test_run WHERE run_id = $1', [runId]);
  });

  it('앞 빌드와 견줘 요구사항 · 테스트 차이와 까닭을 적는다', async () => {
    const c = await 센다('1.0');
    expect(c.requirements).toEqual({
      from: 1,
      to: 2,
      added: [{ reqId: 'XQC-REQ-003', text: '비밀번호를 바꾼다' }],
      changed: [{ reqId: 'XQC-REQ-001', text: '두 단계로 로그인한다' }],
      removed: [{ reqId: 'XQC-REQ-002', text: '로그아웃한다' }],
    });
    expect(c.tests).toEqual({
      recorded: true,
      fromCommit: 'c1',
      toCommit: 'c2',
      added: [{ tcId: 'XQC-FN-004', name: 'XQC-FN-004 이름', reason: { kind: 'PRD_APPLY', requestId: expect.any(Number), issueKey: null, prUrl: null } }],
      modified: [
        { tcId: 'XQC-FN-001', name: 'XQC-FN-001 이름', file: false, expected: true, reason: { kind: 'EDIT', requestId: expect.any(Number), issueKey: null, prUrl: 'https://github.com/o/t/pull/11' } },
        { tcId: 'XQC-FN-002', name: 'XQC-FN-002 이름', file: true, expected: false, reason: { kind: 'TEST_FIX', requestId: expect.any(Number), issueKey: 'XQC-9', prUrl: 'https://github.com/o/t/pull/12' } },
      ],
      removed: [{ tcId: 'XQC-FN-003', name: 'XQC-FN-003 이름', reason: null }],
    });
  });

  it('제품은 배포가 건 실행으로 이슈를 찾고, Bunker 를 못 읽으면 노트 사건의 제목을 쓴다', async () => {
    const c = await 센다('1.0');
    expect(c.product).toEqual({
      linked: true,
      deploys: [{ buildNo: 'abc1234-1105', at: expect.any(String) }],
      issues: [{ key: 'XQC-1', type: 'TASK', title: '로그인 두 단계', prs: [{ number: 7, url: 'https://github.com/o/app/pull/7', title: '두 단계 로그인' }] }],
    });
    expect(c.confirmed).toEqual([{ tcId: 'XQC-FN-002', runId: 실행.이번, verdict: 'BUG', byName: '판정한 사람', at: expect.any(String) }]);
  });

  it('앞 빌드가 없으면 요구사항 · 테스트는 비고, 테스트 버전이 없던 앞 빌드는 「기록 없음」이다', async () => {
    const 없음 = await 센다(null);
    expect(없음.requirements).toBeNull();
    expect(없음.tests).toBeNull();
    expect(없음.product).toMatchObject({ linked: true });
    await pool.query('UPDATE run_item SET case_sha256 = NULL WHERE run_id = $1', [실행.앞]);
    expect((await 센다('1.0')).tests).toEqual({ recorded: false });
    await pool.query("UPDATE run_item SET case_sha256 = CASE tc_id WHEN 'XQC-FN-001' THEN 'a' WHEN 'XQC-FN-002' THEN 'b' WHEN 'XQC-FN-003' THEN 'c' ELSE 'e' END WHERE run_id = $1", [실행.앞]);
  });

  it('Issue Bunker 를 잇지 않은 프로젝트는 제품 줄이 미연결이다', async () => {
    await pool.query('DELETE FROM bts_link WHERE project_id = $1', [프로젝트]);
    expect((await 센다('1.0')).product).toEqual({ linked: false });
  });
});

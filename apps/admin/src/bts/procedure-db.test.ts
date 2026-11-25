// 프로시저 안 케이스의 Issue Bunker 이슈 등록과 처리 — 실패 케이스만 · 처음부터의 재현 단계 · 실행 단위 비밀값 가림 · 한 건의 Blocked · 수정 확인은 대상 케이스만 (도메인/BTS 「테스트 프로시저 — 이슈 등록과 이슈 처리」)
// DATABASE_URL 이 있을 때만 돈다

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 게임실패자료 } from '../prd/gameFailData.js';
import type { 부르기함수 } from './client.js';
import { 실패등록 } from './failReport.js';
import { 테스트수정실행뒤 } from './testFixRerun.js';

vi.mock('../execution/dispatcher.js', () => ({ dispatch: vi.fn(async () => undefined) }));

const 연결 = process.env.DATABASE_URL;

type 줄 = { tcId: string; status: 'PASS' | 'FAIL' | 'NA'; 막은?: string };

describe.skipIf(연결 === undefined)('프로시저 안 케이스의 Issue Bunker 이슈', () => {
  let pool: Pool;
  let 프로젝트 = 0;
  let 서비스 = 0;
  let 차례 = 0;
  const 앞공개 = process.env.PLATFORM_PUBLIC_URL;
  const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;
  let 임시 = '';

  const 답: 부르기함수 = async (_자리, _method, 경로) =>
    경로 === '/api/v1/resolutions' ? { status: 200, json: { data: [{ id: 'r-test', name: '테스트 문제' }] } } : { status: 200, json: { data: { currentStateKey: 'fix' } } };

  /** 프로시저 XPB-TP-001 하나가 통째로 돈 실행 — 케이스마다 비밀번호가 다르고 절차 제목에 되비친다 */
  async function 실행(줄들: 줄[], 붙는실행?: number): Promise<number> {
    차례++;
    const runId = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, started_at, finished_at, origin, rerun_of)
           VALUES ('XPB 실행', 'xpb', 'qa', 'FINISHED', $1, 'XPB 앱', '', '', 'FN',
                   now() - interval '1 day' + $2 * interval '1 minute', now() - interval '1 day' + $2 * interval '1 minute' + interval '30 seconds', $3, $4)
           RETURNING run_id`,
          [서비스, 차례, 붙는실행 === undefined ? 'MANUAL' : 'SINGLE', 붙는실행 ?? null],
        )
      ).rows[0]!.run_id,
    );
    const execId = Number(
      (
        await pool.query<{ exec_id: string }>(
          `INSERT INTO run_exec (run_id, file_path, proc_id, proc_name, platform, timeout_ms) VALUES ($1, 'xpb/XPB-TP-001.spec.ts', 'XPB-TP-001', '글쓰기', 'android', 600000) RETURNING exec_id`,
          [runId],
        )
      ).rows[0]!.exec_id,
    );
    for (const [i, 항] of 줄들.entries()) {
      const 비번 = `XPB-PW-${항.tcId.slice(-3)}`;
      const historyId = Number(
        (
          await pool.query<{ history_id: string }>(
            `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema,
                                   status, error, duration_ms, finished_at, exec_id, exec_seq, blocked_by)
             VALUES ($1, $2, 'android', 1, $3, 'xpb/XPB-TP-001.spec.ts', 120000, '[]', $4, '{}', $5, '{}', $6, $7, 100, now(), $8, $9, $10) RETURNING history_id`,
            [
              runId,
              항.tcId,
              `${항.tcId} 이름`,
              JSON.stringify({ password: 비번 }),
              JSON.stringify({ properties: { password: { type: 'string', secret: true } } }),
              항.status,
              항.막은 === undefined ? null : JSON.stringify({ message: 'BLOCKED' }),
              execId,
              i + 1,
              항.막은 ?? null,
            ],
          )
        ).rows[0]!.history_id,
      );
      if (항.status === 'NA') continue;
      await pool.query(
        `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions) VALUES ($1, 1, $2, $3, 10, $4)`,
        [
          historyId,
          `${비번} 로 로그인한다`,
          항.status,
          JSON.stringify(항.status === 'FAIL' ? [{ statement: '글이 올라간다', status: 'FAIL', actual: null, expected: '올라감' }] : []),
        ],
      );
    }
    return runId;
  }

  const 등록들 = async () =>
    (await pool.query<{ kind: string; tc_id: string; payload: Record<string, unknown> }>('SELECT kind, tc_id, payload FROM bts_outbox WHERE service_id = $1 ORDER BY id', [서비스])).rows;
  const 비우기 = () => pool.query('DELETE FROM bts_outbox WHERE service_id = $1', [서비스]);
  // 앞 검사의 열린 이슈가 남으면 다음 검사의 실패가 등록 대신 「또 실패」 댓글이 된다
  beforeEach(async () => {
    await 비우기();
    await pool.query('DELETE FROM bts_test_fix WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM bts_issue_case WHERE service_id = $1', [서비스]);
  });

  /** 「테스트 수정」 확인 실행이 돈 바퀴 줄 — 반영까지 끝났다 */
  async function 바퀴(key: string, tcId: string, 실패실행: number, 확인실행: number): Promise<number> {
    const 뿌리 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, pr_url) VALUES ($1, 'AUTHOR', '{}', 'bts', 'Issue Bunker', 'DONE', 'https://github.com/o/r/pull/1') RETURNING id`,
          [서비스],
        )
      ).rows[0]!.id,
    );
    await pool.query(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, first_run) VALUES ($1, $2, $3, $4, 'qa', $5)`, [프로젝트, key, 서비스, tcId, 실패실행]);
    return Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, failed_run, moved_by, moved_by_id, request_id, pr_url, merge, state, rerun_id)
           VALUES ($1, $2, $3, $4, 'qa', $5, 'QA 김', 'u-qa', $6, 'https://github.com/o/r/pull/1', 'AUTO', 'RERUNNING', $7) RETURNING id`,
          [프로젝트, key, 서비스, tcId, 실패실행, 뿌리, 확인실행],
        )
      ).rows[0]!.id,
    );
  }

  beforeAll(async () => {
    process.env.PLATFORM_PUBLIC_URL = 'https://commander.xpb.test';
    임시 = mkdtempSync(join(tmpdir(), 'xpb-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    pool = new Pool({ connectionString: 연결 });
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XPB 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind) VALUES ('XPB', 'XPB 앱', '#112233', '', 'xpb', $1, 'APP') RETURNING id`,
          [프로젝트],
        )
      ).rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.example.com', 'DM', 'qahub-xpb', 's', '{"TEST_FIX": "fix", "QA_REVIEW": "qa_review", "CLOSED": "closed"}', '{"TEST_PROBLEM": "테스트 문제"}', 'xpb')`,
      [프로젝트],
    );
  });

  afterAll(async () => {
    // bts_test_fix · bts_outbox · bts_issue_case 는 service 와, bts_link 는 project 와 같이 지워진다. 남은 애플리케이션이 없는 project 는 트리거가 지운다
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM run_exec WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1 AND rerun_of IS NOT NULL', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.end();
    if (앞공개 === undefined) delete process.env.PLATFORM_PUBLIC_URL;
    else process.env.PLATFORM_PUBLIC_URL = 앞공개;
    if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
    rmSync(임시, { recursive: true, force: true });
  });

  it('실패한 케이스만 올리고 Blocked 는 올리지 않는다 — 본문에 프로시저 줄 · 처음부터의 재현 단계 · 후속 케이스 · 실행 단위 폴더의 logcat, 앞 케이스의 비밀값도 가린다', async () => {
    const runId = await 실행([
      { tcId: 'XPB-FN-101', status: 'PASS' },
      { tcId: 'XPB-FN-102', status: 'FAIL' },
      { tcId: 'XPB-FN-103', status: 'NA', 막은: 'XPB-FN-102' },
      { tcId: 'XPB-FN-104', status: 'NA', 막은: 'XPB-FN-102' },
    ]);
    // 팜 증적은 실행 단위 폴더에 한 벌이다 — 케이스 줄 번호 폴더에는 없다
    const 단위 = Number((await pool.query<{ exec_id: string }>('SELECT exec_id FROM run_item WHERE run_id = $1 LIMIT 1', [runId])).rows[0]!.exec_id);
    const 폴더 = join(runDir(String(runId), String(단위)), FARM_EVIDENCE_DIR);
    mkdirSync(폴더, { recursive: true });
    writeFileSync(join(폴더, 'logcat.txt'), '11-04 10:00:03.000  4321  4321 F libc    : Fatal signal 6 — 비밀번호 XPB-PW-101 거절\n');
    expect(await 실패등록(runId, 0)).toBe(1);
    const [등록] = await 등록들();
    expect(등록).toMatchObject({ kind: 'CREATE', tc_id: 'XPB-FN-102' });
    const 글 = String(등록!.payload.description);
    expect(글).toContain('**프로시저** — XPB-TP-001 글쓰기 · 4건 중 2번째');
    expect(글).toContain('**후속 케이스** — XPB-FN-103 XPB-FN-103 이름 · XPB-FN-104 XPB-FN-104 이름');
    expect(글).toContain('**XPB-FN-101 XPB-FN-101 이름 — Pass**');
    expect(글).toContain('2. ******** 로 로그인한다 ← 여기서 실패');
    expect(글).toContain('F libc    : Fatal signal 6 — 비밀번호 ******** 거절');
    expect(글).not.toContain('XPB-PW-');
  });

  it('게임 고침의 실패 자료는 실행 단위 폴더에서 읽고 같은 프로시저 앞 케이스의 비밀값도 가린다', async () => {
    const runId = await 실행([
      { tcId: 'XPB-FN-101', status: 'PASS' },
      { tcId: 'XPB-FN-102', status: 'FAIL' },
    ]);
    const 단위 = Number((await pool.query<{ exec_id: string }>('SELECT exec_id FROM run_item WHERE run_id = $1 LIMIT 1', [runId])).rows[0]!.exec_id);
    const 폴더 = join(runDir(String(runId), String(단위)), FARM_EVIDENCE_DIR);
    mkdirSync(폴더, { recursive: true });
    writeFileSync(join(폴더, 'game-tree.txt'), '/Canvas/Login/XPB-PW-101');
    const 자료 = await 게임실패자료(서비스, runId, 'XPB-FN-102');
    expect(자료).toMatchObject({ game: { tree: '/Canvas/Login/********', errors: null } });
    expect(JSON.stringify(자료)).not.toContain('XPB-PW-');
  });

  it('한 건에서 Blocked 로 끝난 케이스는 붙는 실행의 옛 Fail 로 「또 실패」 댓글을 달지 않고, 그 한 건에서 실패한 케이스만 올린다', async () => {
    const 부모 = await 실행([
      { tcId: 'XPB-FN-101', status: 'PASS' },
      { tcId: 'XPB-FN-102', status: 'PASS' },
      { tcId: 'XPB-FN-103', status: 'FAIL' },
      { tcId: 'XPB-FN-104', status: 'PASS' },
    ]);
    await pool.query(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, first_run) VALUES ($1, 'DM-103', $2, 'XPB-FN-103', 'qa', $3)`, [프로젝트, 서비스, 부모]);
    const 한건 = await 실행(
      [
        { tcId: 'XPB-FN-101', status: 'PASS' },
        { tcId: 'XPB-FN-102', status: 'FAIL' },
        { tcId: 'XPB-FN-103', status: 'NA', 막은: 'XPB-FN-102' },
        { tcId: 'XPB-FN-104', status: 'NA', 막은: 'XPB-FN-102' },
      ],
      부모,
    );
    await 실패등록(한건, 0);
    expect((await 등록들()).map((r) => [r.kind, r.tc_id])).toEqual([['CREATE', 'XPB-FN-102']]);
  });

  it('수정 확인 실행은 대상 케이스를 올리지 않고 같이 돈 다른 케이스의 실패는 올리며, 대상 케이스가 통과면 닫고 통과 못 한 다른 케이스를 덧붙인다', async () => {
    const 부모 = await 실행([
      { tcId: 'XPB-FN-101', status: 'PASS' },
      { tcId: 'XPB-FN-102', status: 'FAIL' },
      { tcId: 'XPB-FN-103', status: 'NA', 막은: 'XPB-FN-102' },
      { tcId: 'XPB-FN-104', status: 'NA', 막은: 'XPB-FN-102' },
    ]);
    const 확인 = await 실행(
      [
        { tcId: 'XPB-FN-101', status: 'PASS' },
        { tcId: 'XPB-FN-102', status: 'PASS' },
        { tcId: 'XPB-FN-103', status: 'FAIL' },
        { tcId: 'XPB-FN-104', status: 'PASS' },
      ],
      부모,
    );
    const id = await 바퀴('DM-102', 'XPB-FN-102', 부모, 확인);
    await 실패등록(확인, 0);
    expect((await 등록들()).map((r) => [r.kind, r.tc_id])).toEqual([['CREATE', 'XPB-FN-103']]);

    await 비우기();
    await 테스트수정실행뒤(확인, 답);
    expect((await pool.query('SELECT state FROM bts_test_fix WHERE id = $1', [id])).rows[0]).toEqual({ state: 'PASSED' });
    const [닫기] = (await pool.query<{ kind: string; payload: { comment: string } }>(`SELECT kind, payload FROM bts_outbox WHERE issue_key = 'DM-102' AND project_id = $1`, [프로젝트])).rows;
    expect(닫기?.kind).toBe('TRANSITION');
    expect(닫기?.payload.comment).toMatch(/^Android 앱 에서 통과했어요 · RUN \d+\n.+\n같은 프로시저의 다른 테스트 1건은 통과하지 못했어요 — XPB-FN-103$/);
  });

  it('대상 케이스가 Blocked 로 끝나면 막은 케이스를 적어 되돌리고, 게임 고침 줄도 그 까닭으로 끝낸다', async () => {
    const 부모 = await 실행([
      { tcId: 'XPB-FN-101', status: 'PASS' },
      { tcId: 'XPB-FN-102', status: 'PASS' },
      { tcId: 'XPB-FN-103', status: 'FAIL' },
      { tcId: 'XPB-FN-104', status: 'PASS' },
    ]);
    const 확인 = await 실행(
      [
        { tcId: 'XPB-FN-101', status: 'PASS' },
        { tcId: 'XPB-FN-102', status: 'FAIL' },
        { tcId: 'XPB-FN-103', status: 'NA', 막은: 'XPB-FN-102' },
        { tcId: 'XPB-FN-104', status: 'NA', 막은: 'XPB-FN-102' },
      ],
      부모,
    );
    const id = await 바퀴('DM-203', 'XPB-FN-103', 부모, 확인);
    const 게임 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO bts_test_fix (project_id, service_id, tc_id, env, failed_run, moved_by, failure, state, rerun_id)
           VALUES ($1, $2, 'XPB-FN-104', 'qa', $3, 'Agent', 'notFound', 'RERUNNING', $4) RETURNING id`,
          [프로젝트, 서비스, 부모, 확인],
        )
      ).rows[0]!.id,
    );
    await 테스트수정실행뒤(확인, 답);
    expect((await pool.query('SELECT state, reason FROM bts_test_fix WHERE id = $1', [id])).rows[0]).toMatchObject({
      state: 'FAILED',
      reason: expect.stringMatching(/^선행 케이스 XPB-FN-102 가 통과하지 못해 확인하지 못했어요\. 수정한 테스트는 반영됐어요 — 선행 케이스가 통과하면 다시 실행해 주세요 · RUN \d+/),
    });
    const 보낸 = (await pool.query<{ kind: string }>(`SELECT kind FROM bts_outbox WHERE issue_key = 'DM-203' AND project_id = $1 ORDER BY id`, [프로젝트])).rows.map((r) => r.kind);
    expect(보낸).toEqual(['TRANSITION', 'ASSIGN', 'COMMENT']);
    expect((await pool.query('SELECT state, reason FROM bts_test_fix WHERE id = $1', [게임])).rows[0]).toMatchObject({
      state: 'FAILED',
      reason: expect.stringMatching(/^선행 케이스 XPB-FN-102 가 통과하지 못해 확인하지 못했어요 · RUN \d+/),
    });
  });
});

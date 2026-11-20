// 게임 실패 자동 수정 — 실행 끝에서 조작 실패로 세우기 · 거르기 · PR 열림 줄 나누기 · 반영 판정 · 다시 실행 · 끝 (도메인/게임 §3.10 「실패 자동 수정」)
// DATABASE_URL 이 있을 때만 돈다. 분배는 가짜로 바꿔 러너를 부르지 않는다

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 게임자동수정실행뒤 } from './gameFix.js';
import { 테스트수정PR열림 } from './testFix.js';
import { 반영한사람적기, 자동반영실패, 테스트수정병합판정 } from './testFixMerge.js';
import { 테스트수정반영뒤, 테스트수정실행뒤 } from './testFixRerun.js';
import { 테스트수정점검 } from './testFixSweep.js';

vi.mock('../execution/dispatcher.js', () => ({ dispatch: vi.fn(async () => undefined) }));

const 연결 = process.env.DATABASE_URL;

const 찾지못함 = '켜진 오브젝트 중에 「공격」 이 없습니다';
const 시간초과 = '게임이 30초 안에 답하지 않았습니다';

describe.skipIf(연결 === undefined)('게임 실패 자동 수정', () => {
  let pool: Pool;
  let 서비스 = 0;
  let 이은서비스 = 0;
  let 웹서비스 = 0;
  const 프로젝트들: number[] = [];
  const 팜 = process.env.DEVICE_FARM_URL;
  const 공개 = process.env.PLATFORM_PUBLIC_URL;
  const 케이스들 = Array.from({ length: 12 }, (_, i) => `XQZ-FN-${String(i + 1).padStart(3, '0')}`);

  interface 항목 {
    tcId: string;
    status?: string;
    error?: string;
    실패확인?: string;
    attempt?: number;
  }

  const 실행 = async (항목들: 항목[], 옵션: { 서비스?: number; origin?: string; status?: string } = {}): Promise<number> => {
    const runId = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url, kind, origin)
           VALUES ('XQZ 실행', 'xqz', $2, 'qa', $1, 'XQZ', '', 'https://qa.xqz.test', 'FN', $3) RETURNING run_id`,
          [옵션.서비스 ?? 서비스, 옵션.status ?? 'FINISHED', 옵션.origin ?? 'MANUAL'],
        )
      ).rows[0]!.run_id,
    );
    for (const i of 항목들) {
      const 번호 = Number(
        (
          await pool.query<{ history_id: string }>(
            `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, params, expected, status, duration_ms, finished_at, file_path, param_schema, expected_schema, timeout_ms, error)
             VALUES ($1, $2, 'android', $3, '검사', '{}', '{}', $4, 100, now(), 'tests/xqz/a.spec.ts', '{}', '{}', 0, $5) RETURNING history_id`,
            [runId, i.tcId, i.attempt ?? 1, i.status ?? 'FAIL', i.error === undefined ? null : JSON.stringify({ message: i.error })],
          )
        ).rows[0]!.history_id,
      );
      if (i.실패확인 !== undefined) {
        await pool.query(`INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions) VALUES ($1, 1, '처치한다', 'FAIL', 10, $2)`, [
          번호,
          JSON.stringify([{ statement: i.실패확인, status: 'FAIL', actual: 1, expected: 2 }]),
        ]);
      }
    }
    return runId;
  };

  const 줄들 = async () =>
    (
      await pool.query<{ tc_id: string; state: string; failure: string; reason: string | null; pr_url: string | null; merge: string | null; person_why: string[]; request_id: string | null; rerun_id: string | null }>(
        'SELECT tc_id, state, failure, reason, pr_url, merge, person_why, request_id, rerun_id FROM bts_test_fix WHERE service_id = $1 ORDER BY id',
        [서비스],
      )
    ).rows;
  const 요청 = async (id: number) =>
    (await pool.query<{ params: Record<string, unknown>; requested_by: string; requested_by_name: string; kind: string; discarded_at: Date | null }>('SELECT params, requested_by, requested_by_name, kind, discarded_at FROM authoring_request WHERE id = $1', [id])).rows[0]!;

  /** 조작 실패 두 건을 낸 끝난 실행으로 고침 요청을 세운다 */
  const 세운다 = async (tcIds: string[] = [케이스들[0]!, 케이스들[1]!]) => {
    const runId = await 실행(tcIds.map((tcId, i) => ({ tcId, error: i % 2 === 0 ? 찾지못함 : 시간초과 })));
    const 번호 = await 게임자동수정실행뒤(runId);
    return { runId, 번호: 번호! };
  };
  const PR = async (번호: number, 주소: string, 결과: Record<string, unknown>) => {
    await pool.query(`UPDATE authoring_request SET status = 'DONE', pr_url = $2, result = $3 WHERE id = $1`, [번호, 주소, 결과]);
    return 테스트수정PR열림({ serviceId: 서비스, params: (await 요청(번호)).params }, 번호, 주소, 결과);
  };

  const 비운다 = async () => {
    await pool.query('DELETE FROM bts_test_fix WHERE service_id = ANY($1)', [[서비스, 이은서비스, 웹서비스]]);
    await pool.query(`DELETE FROM authoring_request WHERE service_id = $1 AND kind = 'MERGE'`, [서비스]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [[서비스, 이은서비스, 웹서비스]]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1) AND rerun_of IS NOT NULL', [[서비스, 이은서비스, 웹서비스]]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [[서비스, 이은서비스, 웹서비스]]);
  };

  const 서비스만들기 = async (prefix: string, 프로젝트: number, kind: string, 플랫폼: string | null) =>
    Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind, game_platform) VALUES ($1, $1, '#112233', '', $1, $2, $3, $4) RETURNING id`,
          [prefix, 프로젝트, kind, 플랫폼],
        )
      ).rows[0]!.id,
    );

  beforeAll(async () => {
    delete process.env.PLATFORM_PUBLIC_URL;
    process.env.DEVICE_FARM_URL = 'http://farm.xqz.test';
    pool = new Pool({ connectionString: 연결 });
    const 프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQZ 프로젝트') RETURNING id`)).rows[0]!.id);
    const 이은프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQZ 이은 프로젝트') RETURNING id`)).rows[0]!.id);
    프로젝트들.push(프로젝트, 이은프로젝트);
    서비스 = await 서비스만들기('XQZ', 프로젝트, 'GAME', 'android');
    웹서비스 = await 서비스만들기('XQZW', 프로젝트, 'SCREEN', null);
    이은서비스 = await 서비스만들기('XQZB', 이은프로젝트, 'GAME', 'android');
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'https://qa.xqz.test')`, [서비스]);
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.example.com', 'DM', 'qahub-xqz', 's', '{"TEST_FIX": "fix"}', '{}', 'xqz')`,
      [이은프로젝트],
    );
    for (const tcId of 케이스들) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $1, '["android"]', '[]', 'xqz/a.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
        [tcId],
      );
    }
  });

  beforeEach(async () => {
    await 비운다();
    process.env.DEVICE_FARM_URL = 'http://farm.xqz.test';
  });

  afterAll(async () => {
    await 비운다();
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [[서비스, 이은서비스, 웹서비스]]);
    await pool.end();
    if (팜 === undefined) delete process.env.DEVICE_FARM_URL;
    else process.env.DEVICE_FARM_URL = 팜;
    if (공개 !== undefined) process.env.PLATFORM_PUBLIC_URL = 공개;
  });

  it('요소를 찾지 못함 · 타임아웃만 맡아 요청 하나에 담는다 — 요청자는 Agent, 케이스마다 줄이 선다', async () => {
    const { runId, 번호 } = await 세운다();
    expect(await 요청(번호)).toMatchObject({ kind: 'AUTHOR', requested_by: 'agent', requested_by_name: 'Agent' });
    expect((await 요청(번호)).params).toMatchObject({
      prdApply: true,
      testFix: {
        auto: true,
        cases: [
          { runId, tcId: 'XQZ-FN-001', env: 'qa', failure: 'notFound' },
          { runId, tcId: 'XQZ-FN-002', env: 'qa', failure: 'timeout' },
        ],
        note: '',
      },
      decision: { after: [], count: 2 },
    });
    expect(await 줄들()).toEqual([
      expect.objectContaining({ tc_id: 'XQZ-FN-001', state: 'FIXING', failure: 'notFound', request_id: String(번호) }),
      expect.objectContaining({ tc_id: 'XQZ-FN-002', state: 'FIXING', failure: 'timeout', request_id: String(번호) }),
    ]);
    expect((await pool.query('SELECT issue_key FROM bts_test_fix WHERE service_id = $1', [서비스])).rows.every((r) => r.issue_key === null)).toBe(true);
  });

  it('기대 결과 불일치가 섞인 케이스는 안 맡는다 — 확인 문장이 깨진 디바이스가 하나라도 있으면 그 케이스를 뺀다', async () => {
    const runId = await 실행([
      { tcId: 'XQZ-FN-003', error: 찾지못함, 실패확인: '처치 로그가 남는다' },
      { tcId: 'XQZ-FN-004', error: 시간초과 },
    ]);
    const 번호 = await 게임자동수정실행뒤(runId);
    expect((await 줄들()).map((r) => r.tc_id)).toEqual(['XQZ-FN-004']);
    expect(번호).not.toBeNull();
  });

  it('BTS 를 이은 프로젝트 · 웹 애플리케이션 · 한 건 실행 · 반복 실행 · 안 끝난 실행은 안 세운다', async () => {
    const 실패 = [{ tcId: 'XQZ-FN-001', error: 찾지못함 }];
    expect(await 게임자동수정실행뒤(await 실행(실패, { 서비스: 이은서비스 }))).toBeNull();
    expect(await 게임자동수정실행뒤(await 실행(실패, { 서비스: 웹서비스 }))).toBeNull();
    expect(await 게임자동수정실행뒤(await 실행(실패, { origin: 'SINGLE' }))).toBeNull();
    expect(await 게임자동수정실행뒤(await 실행([...실패, { tcId: 'XQZ-FN-001', error: 찾지못함, attempt: 2 }]))).toBeNull();
    expect(await 게임자동수정실행뒤(await 실행(실패, { status: 'ABORTED' }))).toBeNull();
    expect(await 줄들()).toEqual([]);
  });

  it('맡을 케이스가 상한(10)을 넘으면 하나도 안 세운다', async () => {
    const 로그 = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(await 게임자동수정실행뒤(await 실행(케이스들.slice(0, 11).map((tcId) => ({ tcId, error: 시간초과 }))))).toBeNull();
    expect(로그).toHaveBeenCalledTimes(1);
    로그.mockRestore();
    expect(await 줄들()).toEqual([]);
    expect(await 게임자동수정실행뒤(await 실행(케이스들.slice(0, 10).map((tcId) => ({ tcId, error: 시간초과 }))))).not.toBeNull();
  });

  it('열린 작성이 있으면 안 세운다 — 앞 자동 수정이 사람 확인을 기다려도 열린 작성이다', async () => {
    const { 번호 } = await 세운다([케이스들[0]!]);
    expect(await 게임자동수정실행뒤(await 실행([{ tcId: 'XQZ-FN-005', error: 찾지못함 }]))).toBeNull();
    expect((await 줄들()).map((r) => r.tc_id)).toEqual(['XQZ-FN-001']);
    await pool.query('UPDATE authoring_request SET discarded_at = now() WHERE id = $1', [번호]);
    await pool.query(`UPDATE bts_test_fix SET state = 'GAVE_UP' WHERE service_id = $1`, [서비스]);
    expect(await 게임자동수정실행뒤(await 실행([{ tcId: 'XQZ-FN-005', error: 찾지못함 }]))).not.toBeNull();
  });

  it('실패 · 그만둠으로 끝난 케이스는 풀림 전까지 안 맡고, 그 뒤 모든 디바이스가 통과하면 다시 맡는다', async () => {
    await pool.query(
      `INSERT INTO bts_test_fix (project_id, service_id, tc_id, env, failure, state, updated_at)
       VALUES ($1, $2, 'XQZ-FN-001', 'qa', 'timeout', 'FAILED', now() - interval '1 hour')`,
      [프로젝트들[0], 서비스],
    );
    expect(await 게임자동수정실행뒤(await 실행([{ tcId: 'XQZ-FN-001', error: 시간초과 }]))).toBeNull();
    await 실행([{ tcId: 'XQZ-FN-001', status: 'PASS' }]);
    expect(await 게임자동수정실행뒤(await 실행([{ tcId: 'XQZ-FN-001', error: 시간초과 }]))).not.toBeNull();
  });

  it('흔들려 끝난 케이스가 연달아 둘이면 풀림 전까지 안 맡고, 한 번이면 맡는다', async () => {
    const 흔들림 = (분전: number) =>
      pool.query(
        `INSERT INTO bts_test_fix (project_id, service_id, tc_id, env, failure, state, updated_at)
         VALUES ($1, $2, 'XQZ-FN-001', 'qa', 'notFound', 'FLAKY', now() - make_interval(mins => $3))`,
        [프로젝트들[0], 서비스, 분전],
      );
    await 흔들림(120);
    await 흔들림(60);
    expect(await 게임자동수정실행뒤(await 실행([{ tcId: 'XQZ-FN-001', error: 찾지못함 }]))).toBeNull();
    await pool.query(`UPDATE bts_test_fix SET state = 'PASSED' WHERE service_id = $1 AND updated_at < now() - interval '90 minutes'`, [서비스]);
    expect(await 게임자동수정실행뒤(await 실행([{ tcId: 'XQZ-FN-001', error: 찾지못함 }]))).not.toBeNull();
  });

  it('PR 이 열리면 케이스 끝대로 줄을 나눈다 — 고침은 병합 기다림, 흔들림은 FLAKY, 못 찾음은 까닭과 함께 그만둠', async () => {
    const { 번호 } = await 세운다([케이스들[0]!, 케이스들[1]!, 케이스들[2]!]);
    const 주소 = 'https://github.com/o/r/pull/401';
    const 결과 = {
      testFix: {
        summary: '조작 이름을 바꿔요',
        reruns: 2,
        cases: [
          { tcId: 'XQZ-FN-001', outcome: 'FIXED' },
          { tcId: 'XQZ-FN-002', outcome: 'FLAKY' },
          { tcId: 'XQZ-FN-003', outcome: 'NOT_FOUND', note: '버튼이 없어졌어요' },
        ],
      },
    };
    expect(await PR(번호, 주소, 결과)).toBe(false);
    expect(await 줄들()).toEqual([
      expect.objectContaining({ tc_id: 'XQZ-FN-001', state: 'WAIT_MERGE', pr_url: 주소 }),
      expect.objectContaining({ tc_id: 'XQZ-FN-002', state: 'FLAKY' }),
      expect.objectContaining({ tc_id: 'XQZ-FN-003', state: 'GAVE_UP', reason: '고칠 곳을 찾지 못했어요 — 버튼이 없어졌어요' }),
    ]);
    await 테스트수정PR열림({ serviceId: 서비스, params: (await 요청(번호)).params }, 번호, 주소, 결과);
    expect((await 줄들()).map((r) => r.state)).toEqual(['WAIT_MERGE', 'FLAKY', 'GAVE_UP']);
  });

  it('케이스 끝 칸이 없으면 고치는 줄 전부가 병합 기다림이다', async () => {
    const { 번호 } = await 세운다();
    await PR(번호, 'https://github.com/o/r/pull/402', { testFix: { summary: '', reruns: 1 } });
    expect((await 줄들()).map((r) => r.state)).toEqual(['WAIT_MERGE', 'WAIT_MERGE']);
  });

  it('PR 없이 끝난 요청은 줄을 FLAKY · 그만둠으로 끝내고 서버가 폐기해 다음 자동 수정을 막지 않는다', async () => {
    const { 번호 } = await 세운다();
    await pool.query(`UPDATE authoring_request SET status = 'DONE', result = $2 WHERE id = $1`, [
      번호,
      { testFix: { cases: [{ tcId: 'XQZ-FN-001', outcome: 'FLAKY' }, { tcId: 'XQZ-FN-002', outcome: 'NOT_FOUND', note: '창이 안 열려요' }] } },
    ]);
    await 테스트수정점검();
    expect(await 줄들()).toEqual([
      expect.objectContaining({ tc_id: 'XQZ-FN-001', state: 'FLAKY' }),
      expect.objectContaining({ tc_id: 'XQZ-FN-002', state: 'GAVE_UP', reason: '고칠 곳을 찾지 못했어요 — 창이 안 열려요' }),
    ]);
    expect((await 요청(번호)).discarded_at).not.toBeNull();
    expect(await 게임자동수정실행뒤(await 실행([{ tcId: 'XQZ-FN-005', error: 찾지못함 }]))).not.toBeNull();
  });

  it('작성이 실패하거나 멈추면 줄을 FAILED 로 끝내고 폐기한다 · 칸 없이 PR 없이 끝나면 모두 고칠 곳을 못 찾음이다', async () => {
    const 실패 = await 세운다([케이스들[0]!]);
    await pool.query(`UPDATE authoring_request SET status = 'FAILED' WHERE id = $1`, [실패.번호]);
    await 테스트수정점검();
    expect(await 줄들()).toEqual([expect.objectContaining({ state: 'FAILED', reason: '테스트 수정 작성이 실패했어요' })]);
    expect((await 요청(실패.번호)).discarded_at).not.toBeNull();

    const 칸없음 = await 세운다([케이스들[1]!]);
    await pool.query(`UPDATE authoring_request SET status = 'DONE', result = '{}' WHERE id = $1`, [칸없음.번호]);
    await 테스트수정점검();
    expect((await 줄들()).map((r) => [r.tc_id, r.state, r.reason])).toEqual([
      ['XQZ-FN-001', 'FAILED', '테스트 수정 작성이 실패했어요'],
      ['XQZ-FN-002', 'GAVE_UP', '고칠 곳을 찾지 못했어요'],
    ]);
    expect((await 요청(칸없음.번호)).discarded_at).not.toBeNull();
  });

  it('반영 판정이 사람 확인을 부르면 까닭을 줄에 적고(같은 글은 한 번), 자동 반영이 실패하면 그 글도 더한다 — 반영을 세우지 않는다', async () => {
    const { 번호 } = await 세운다([케이스들[0]!]);
    const 주소 = 'https://github.com/o/r/pull/403';
    const 결과 = { testFix: { summary: '고쳤어요', reruns: 1, autoMerge: false, held: ['EXPECTED_CHANGED', 'MUTATION_MISSED'] } };
    await PR(번호, 주소, 결과);
    expect(await 테스트수정병합판정(번호, 서비스, 번호, 주소, 결과)).toBe('PERSON');
    expect(await 테스트수정병합판정(번호, 서비스, 번호, 주소, 결과)).toBe('PERSON');
    expect((await 줄들())[0]!.person_why).toEqual(['기대값이 바뀌었어요', '일부러 고장 내 보기에서 못 잡은 고장이 있어요']);
    expect((await pool.query(`SELECT 1 FROM authoring_request WHERE kind = 'MERGE' AND service_id = $1`, [서비스])).rowCount).toBe(0);
    await pool.query(`UPDATE bts_test_fix SET merge = 'AUTO' WHERE service_id = $1`, [서비스]);
    await 자동반영실패(번호);
    await 자동반영실패(번호);
    expect((await 줄들())[0]!.person_why.slice(2)).toEqual(['자동 반영이 실패했어요']);
    const 손 = await pool.connect();
    try {
      await 반영한사람적기(손, 번호, 'xqz-admin');
      expect((await 줄들())[0]!.merge).toBe('PERSON');
      await 반영한사람적기(손, 번호, 'agent');
      expect((await 줄들())[0]!.merge).toBe('AUTO');
    } finally {
      손.release();
    }
  });

  it('조건이 다 맞으면 반영을 agent 로 세워 AUTO 를 적고, 반영이 끝나면 고친 케이스 전부를 실행 하나로 다시 돌려 끝에서 PASSED · FAILED 로 나눈다', async () => {
    const { runId, 번호 } = await 세운다();
    const 주소 = 'https://github.com/o/r/pull/404';
    const 결과 = { testFix: { summary: '고쳤어요', reruns: 1, autoMerge: true, held: [] } };
    await PR(번호, 주소, 결과);
    expect(await 테스트수정병합판정(번호, 서비스, 번호, 주소, 결과)).toBe('AUTO');
    expect((await pool.query(`SELECT requested_by, requested_by_name FROM authoring_request WHERE kind = 'MERGE' AND source_id = $1`, [번호])).rows).toEqual([
      { requested_by: 'agent', requested_by_name: 'Agent' },
    ]);
    expect((await 줄들()).map((r) => r.merge)).toEqual(['AUTO', 'AUTO']);

    await 테스트수정반영뒤(번호);
    expect((await 줄들()).map((r) => r.state)).toEqual(['WAIT_MERGE', 'WAIT_MERGE']);

    await pool.query(`UPDATE authoring_request SET status = 'DONE' WHERE kind = 'MERGE' AND source_id = $1`, [번호]);
    await 테스트수정반영뒤(번호);
    await 테스트수정반영뒤(번호);
    const 걸린 = await 줄들();
    expect(걸린.map((r) => r.state)).toEqual(['RERUNNING', 'RERUNNING']);
    const 다시 = Number(걸린[0]!.rerun_id);
    expect(걸린[1]!.rerun_id).toBe(String(다시));
    expect((await pool.query('SELECT 1 FROM test_run WHERE rerun_of = $1', [runId])).rowCount).toBe(1);
    expect((await pool.query('SELECT origin, rerun_of, triggered_by, triggered_by_name FROM test_run WHERE run_id = $1', [다시])).rows[0]).toEqual({
      origin: 'RERUN',
      rerun_of: String(runId),
      triggered_by: 'agent',
      triggered_by_name: 'Agent',
    });
    expect((await pool.query('SELECT tc_id FROM run_item WHERE run_id = $1 ORDER BY tc_id', [다시])).rows.map((r) => r.tc_id)).toEqual(['XQZ-FN-001', 'XQZ-FN-002']);

    await pool.query(`UPDATE run_item SET status = CASE WHEN tc_id = 'XQZ-FN-001' THEN 'PASS' ELSE 'FAIL' END, finished_at = now() WHERE run_id = $1`, [다시]);
    await pool.query(`UPDATE test_run SET status = 'FINISHED' WHERE run_id = $1`, [다시]);
    await 테스트수정실행뒤(다시);
    expect((await 줄들()).map((r) => [r.tc_id, r.state, r.reason])).toEqual([
      ['XQZ-FN-001', 'PASSED', null],
      ['XQZ-FN-002', 'FAILED', `Android 앱 에서 통과하지 못했어요 · RUN ${String(다시)}`],
    ]);
    expect(await 게임자동수정실행뒤(다시)).toBeNull();
  });

  it('디바이스 팜이 없으면 다시 실행을 걸지 않고 줄을 실패로 끝낸다', async () => {
    const { 번호 } = await 세운다([케이스들[0]!]);
    await PR(번호, 'https://github.com/o/r/pull/405', { testFix: { summary: '', reruns: 1 } });
    await pool.query(`INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status) VALUES ($1, 'MERGE', $2, '{}', 'agent', 'Agent', 'DONE')`, [서비스, 번호]);
    delete process.env.DEVICE_FARM_URL;
    await 테스트수정반영뒤(번호);
    expect(await 줄들()).toEqual([expect.objectContaining({ state: 'FAILED', reason: '실제 폰을 못 잡아 확인하지 못했어요' })]);
  });
});

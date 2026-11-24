// 끝난 Android 앱 항목이 앱 조작 맵 줄에 빌드를 적고 조작이 실패한 줄을 「다시 확인」으로 바꾸는지 본다 (도메인/작성 §3.6 「★ 앱 탐색」 결정 10 · APP-F4-09 — DATABASE_URL 이 있을 때만)

import type { StepResult } from '@platform/kit';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createRun, finishItem } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호 = 'XAO-FN-001';
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XAO')";

describe.skipIf(연결 === undefined)('정식 실행이 앱 조작 맵을 고친다', () => {
  let pool: Pool;

  async function 치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM app_route WHERE service_id = ${서비스번호}`);
    await pool.query(`DELETE FROM run_exec WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
    await pool.query('DELETE FROM test_case WHERE tc_id = $1', [번호]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XAO'");
  }

  const 줄들 = async (): Promise<Record<string, string>> =>
    Object.fromEntries(
      (await pool.query<{ action: string; status: string; build_no: string | null }>(`SELECT action, status, build_no FROM app_route WHERE service_id = ${서비스번호}`)).rows.map(
        (r) => [r.action, `${r.status} ${r.build_no ?? '-'}`],
      ),
    );
  const 그대로 = { '「알림」 탭 누르기': 'OK 31', '타임라인에 남의 글 있음': 'OK 31', '「설정」 누르기': 'OK 31', '「프로필」 누르기': 'OK 31', '「삭제」 누르기': 'BLOCKED -' };

  const 빌드로시작 = async (빌드: string | null): Promise<number> => {
    const { runId, items } = await createRun({ origin: 'MANUAL', triggeredBy: 'tester', env: 'qa', items: [{ tcId: 번호, platforms: ['android'], params: {}, expected: {} }] });
    await pool.query('UPDATE test_run SET build_no = $2 WHERE run_id = $1', [runId, 빌드]);
    return items[0]!.historyId;
  };
  const 절차 = (x: Partial<StepResult>): StepResult => ({ seq: 1, title: '알림을 연다', status: 'PASS', durationMs: 1, assertions: [], ...x });
  const 실패절차 = (message: string): StepResult => 절차({ status: 'FAIL', error: { message }, gameFns: ['다른계정글쓰기', '홈화면.알림열기'], gameFailedFns: ['홈화면.알림열기'] });

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ('XAO', 'XAO 앱', '#335577', 'https://xao.example.com', 'xao', 'APP')`);
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES (${서비스번호}, 'qa', 'http://127.0.0.1:5081')`);
    await pool.query(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
       VALUES ($1, $1, '["android"]', '[]', 'xao/x.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
      [번호],
    );
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM app_route WHERE service_id = ${서비스번호}`);
    await pool.query(
      `INSERT INTO app_route (service_id, kind, from_key, action, to_key, helper, fields, status, reason, build_no) VALUES
         (${서비스번호}, 'MOVE', 'app:.MainActivity/홈', '「알림」 탭 누르기', 'app:.MainActivity/알림', NULL, '{"fn":"홈화면.알림열기()","상태":"로그인"}', 'OK', NULL, '31'),
         (${서비스번호}, 'SETUP', '다른 계정이 API 로 글 올리기', '타임라인에 남의 글 있음', 'app:.StatusActivity/글 상세', '다른계정글쓰기', NULL, 'OK', NULL, '31'),
         (${서비스번호}, 'MOVE', 'app:.MainActivity/홈', '「설정」 누르기', 'app:.SettingsActivity/설정', NULL, '{"fn":"홈화면.설정열기"}', 'OK', NULL, '31'),
         (${서비스번호}, 'MOVE', 'app:.MainActivity/홈', '「프로필」 누르기', 'app:.ProfileActivity/프로필', NULL, '{"상태":"로그인"}', 'OK', NULL, '31'),
         (${서비스번호}, 'MOVE', 'app:.StatusActivity/글 상세', '「삭제」 누르기', NULL, NULL, '{"fn":"홈화면.알림열기"}', 'BLOCKED', '두 번째 계정 없음', NULL)`,
    );
  });

  afterAll(async () => {
    await 치운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('통과한 항목이 지난 「확인」 줄에 그 실행의 빌드를 적는다 — 함수 칸(괄호 앞까지) · 도우미 칸으로 맞추고 이름이 없는 crawl 줄 · 진행 불가 줄은 그대로다', async () => {
    const historyId = await 빌드로시작('32');
    await finishItem(historyId, { historyId, status: 'PASS', durationMs: 1, steps: [절차({ gameFns: ['다른계정글쓰기'] }), 절차({ seq: 2, gameFns: ['홈화면.알림열기'] })] });
    expect(await 줄들()).toEqual({ ...그대로, '「알림」 탭 누르기': 'OK 32', '타임라인에 남의 글 있음': 'OK 32' });
  });

  it('빌드 번호가 없는 실행은 통과해도 적을 것이 없다', async () => {
    const historyId = await 빌드로시작(null);
    await finishItem(historyId, { historyId, status: 'PASS', durationMs: 1, steps: [절차({ gameFns: ['홈화면.알림열기'] })] });
    expect(await 줄들()).toEqual(그대로);
  });

  it('요소를 못 찾은 동작의 줄은 「다시 확인」이 되고, 뒤에 온 통과는 그 줄을 풀지도 빌드를 적지도 못한다', async () => {
    const 실패 = await 빌드로시작('32');
    await finishItem(실패, { historyId: 실패, status: 'FAIL', durationMs: 1, steps: [실패절차('Can\'t call click on element with selector "~알림" because element wasn\'t found')] });
    expect(await 줄들()).toEqual({ ...그대로, '「알림」 탭 누르기': 'RECHECK 31' });

    const 통과 = await 빌드로시작('32');
    await finishItem(통과, { historyId: 통과, status: 'PASS', durationMs: 1, steps: [절차({ gameFns: ['홈화면.알림열기', '홈화면.설정열기'] })] });
    expect(await 줄들()).toEqual({ ...그대로, '「알림」 탭 누르기': 'RECHECK 31', '「설정」 누르기': 'OK 32' });
  });

  it('기다리다 끝난 것도 조작 실패다. 연결 문제 · 그 밖의 오류 · 기대값이 다른 실패는 줄을 건드리지 않는다', async () => {
    for (const 글 of ['connect ECONNREFUSED 127.0.0.1:4723', '알림 목록이 비어 있다']) {
      const historyId = await 빌드로시작('32');
      await finishItem(historyId, { historyId, status: 'FAIL', durationMs: 1, steps: [실패절차(글)] });
    }
    const 다름 = await 빌드로시작('32');
    await finishItem(다름, {
      historyId: 다름,
      status: 'FAIL',
      durationMs: 1,
      steps: [절차({ status: 'FAIL', gameFns: ['홈화면.알림열기'], assertions: [{ statement: '알림이 3건이다', status: 'FAIL', actual: 2, expected: 3 }] })],
    });
    expect(await 줄들()).toEqual(그대로);

    const 기다림 = await 빌드로시작('32');
    await finishItem(기다림, { historyId: 기다림, status: 'FAIL', durationMs: 1, steps: [실패절차('element ("~알림") still not displayed after 5000ms')] });
    expect(await 줄들()).toEqual({ ...그대로, '「알림」 탭 누르기': 'RECHECK 31' });
  });
});

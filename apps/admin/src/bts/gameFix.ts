// 게임 실패 자동 수정의 앞 절반 — 실행이 끝나면 조작 실패 케이스로 테스트 고침 작성을 스스로 세우고, PR 이 열리거나 작성이 PR 없이 끝나면 줄을 나눈다 (도메인/게임 §3.10 「실패 자동 수정」 1 · 2 · 3)
// BTS 의 「테스트 수정 바퀴」(testFix*.ts)를 이슈 없이 쓴다 — BTS 로 보내는 것이 없다. 줄은 bts_test_fix 에서 issue_key 가 NULL 인 것이다

import type { Pool, PoolClient } from 'pg';

import { 사슬식, 최신식 } from '../authoring/chainSql.js';
import { 열린작성 } from '../authoring/openRoots.js';
import { 버리기 } from '../authoring/stop.js';
import { 줄세우기 } from '../authoring/store.js';
import { findItem } from '../execution/queries.js';
import { 종류조건 } from '../execution/runKind.js';
import { 잠그고 } from '../prd/store.js';
import { 게임줄끝내기 } from './gameFixRerun.js';
import { type 게임고침, 게임수정요청자, 맡을상한, type 조작실패, type 케이스끝, 케이스끝읽기 } from './gameFixShared.js';
import { 도는상태 } from './testFixIssue.js';
import type { 줄 } from './testFixRerun.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const 고칠곳없음 = '고칠 곳을 찾지 못했어요';

interface 끝난실행 {
  service_id: string;
  project_id: string;
  env: string;
}

// 정식 케이스 실행이 끝났고, BTS 를 안 이은 게임 애플리케이션이고, 자동 수정이 건 다시 실행이 아닌 것 — 한 건 실행 · 반복 실행은 안 맡는다
const 실행SQL = `
  SELECT r.service_id, s.project_id, r.env
    FROM test_run r JOIN service s ON s.id = r.service_id
   WHERE r.run_id = $1 AND ${종류조건('case')} AND r.status = 'FINISHED' AND s.kind = 'GAME'
     AND r.origin IN ('MANUAL', 'SCHEDULED', 'BUILD', 'RERUN')
     AND NOT EXISTS (SELECT 1 FROM bts_link l WHERE l.project_id = s.project_id)
     AND NOT EXISTS (SELECT 1 FROM run_item i WHERE i.run_id = r.run_id AND i.attempt > 1)
     AND NOT EXISTS (SELECT 1 FROM bts_test_fix f WHERE f.rerun_id = r.run_id)`;

/**
 * 통과 못 한 케이스 가운데 조작 실패만. 항목마다 실패 카드와 같은 유형(항목실패를가른다)을 보고, 한 디바이스라도 notFound · timeout 이 아니면
 * 그 케이스는 뺀다 — 확인 문장이 깨진 디바이스가 하나라도 있으면 게임이 기획서와 다르게 움직인 것일 수 있다(mismatch 가 이긴다).
 * 앞 케이스에 막힌 항목(Blocked)은 유형이 없어 여기서 빠진다 — 고칠 곳이 그 케이스에 없다(reporting/itemFailure.ts).
 * 맡을상한을 넘기는 순간 멈춘다 — 빌드나 폰이 깨져 수백 건이 실패한 실행을 항목마다 읽지 않게
 */
async function 조작실패들(pool: Pool, runId: number): Promise<{ tcId: string; failure: 조작실패 }[] | '많음'> {
  const 항목들 = (
    await pool.query<{ history_id: string; tc_id: string }>(
      `SELECT history_id, tc_id FROM run_item WHERE run_id = $1 AND status IN ('FAIL', 'NA') AND finished_at IS NOT NULL ORDER BY tc_id, platform`,
      [runId],
    )
  ).rows;
  const 케이스들 = new Map<string, number[]>();
  for (const x of 항목들) 케이스들.set(x.tc_id, [...(케이스들.get(x.tc_id) ?? []), Number(x.history_id)]);
  const 맡을: { tcId: string; failure: 조작실패 }[] = [];
  for (const [tcId, 번호들] of 케이스들) {
    const 유형들: string[] = [];
    for (const 번호 of 번호들) {
      const 유형 = (await findItem(runId, 번호))?.failure?.type;
      if (유형 !== 'notFound' && 유형 !== 'timeout') break;
      유형들.push(유형);
    }
    if (유형들.length !== 번호들.length) continue;
    맡을.push({ tcId, failure: 유형들.includes('notFound') ? 'notFound' : 'timeout' });
    if (맡을.length > 맡을상한) return '많음';
  }
  return 맡을;
}

/**
 * 「풀림」 — 그 줄이 끝난 뒤 (a) 그 케이스가 모든 디바이스에서 통과한 끝난 실행이 있거나 (b) 그 케이스를 고친 작성의 반영이 있다.
 * 실패 · 그만둔 케이스를 다음 실행마다 같은 고침으로 되풀이하지 않게 하는 문턱이다(failReport.ts 짝SQL 의 released 와 같은 꼴).
 * 프로시저 파일을 고친 작성은 그 파일의 케이스를 다 싣는다 — 게임 고침이 이 케이스는 안 고쳤다고(FIXED 아님) 알렸으면 같은 파일의 다른 케이스를 고친 반영으로 안 푼다
 */
async function 풀렸나(손: PoolClient, 서비스: number, tcId: string, env: string, 뒤: Date): Promise<boolean> {
  const r = await 손.query<{ ok: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM run_item i JOIN test_run r ON r.run_id = i.run_id
                     WHERE r.service_id = $1 AND r.env = $3 AND i.tc_id = $2 AND i.status = 'PASS' AND i.finished_at > $4
                       AND NOT EXISTS (SELECT 1 FROM run_item j WHERE j.run_id = i.run_id AND j.tc_id = i.tc_id AND j.status <> 'PASS'))
         OR EXISTS (SELECT 1 FROM authoring_request m JOIN authoring_request d ON d.id = m.source_id
                     WHERE m.service_id = $1 AND m.kind = 'MERGE' AND m.status = 'DONE' AND m.finished_at > $4
                       AND d.result->'cases' @> jsonb_build_array(jsonb_build_object('tcId', $2::text))
                       AND NOT EXISTS (SELECT 1 FROM jsonb_path_query(d.result, '$.testFix.cases[*]') c WHERE c->>'tcId' = $2 AND c->>'outcome' <> 'FIXED')) AS ok`,
    [서비스, tcId, env, 뒤],
  );
  return r.rows[0]!.ok;
}

/** 이 케이스를 맡아도 되나 — 도는 줄이 없고, 앞 게임 줄이 실패 · 그만둠이거나 연달아 흔들림이면 풀림 전까지 뺀다 */
async function 맡을까(손: PoolClient, 서비스: number, tcId: string, env: string): Promise<boolean> {
  const 도는 = await 손.query('SELECT 1 FROM bts_test_fix WHERE service_id = $1 AND tc_id = $2 AND env = $3 AND state = ANY($4) LIMIT 1', [서비스, tcId, env, 도는상태]);
  if ((도는.rowCount ?? 0) > 0) return false;
  const 앞 = (
    await 손.query<{ state: string; updated_at: Date }>(
      `SELECT state, updated_at FROM bts_test_fix WHERE service_id = $1 AND tc_id = $2 AND env = $3 AND issue_key IS NULL ORDER BY id DESC LIMIT 2`,
      [서비스, tcId, env],
    )
  ).rows;
  const 막힘 = 앞[0] !== undefined && (['FAILED', 'GAVE_UP'].includes(앞[0].state) || (앞.length === 2 && 앞.every((x) => x.state === 'FLAKY')));
  return !막힘 || (await 풀렸나(손, 서비스, tcId, env, 앞[0]!.updated_at));
}

/**
 * 실행이 끝날 때마다 부른다(dispatcher). 맡을 조작 실패가 있으면 고침 요청 하나를 세우고 그 번호를, 아니면 null.
 * 열린 작성이 있으면 안 세운다 — 사람 확인을 기다리는 앞 자동 수정도 열린 작성이다. 맡을 케이스가 상한을 넘으면 하나도 안 세운다
 */
export async function 게임자동수정실행뒤(runId: number): Promise<number | null> {
  const pool = await db();
  const 실행 = (await pool.query<끝난실행>(실행SQL, [runId])).rows[0];
  if (실행 === undefined) return null;
  const 후보 = await 조작실패들(pool, runId);
  if (후보 === '많음') {
    console.log(`[game-fix] 실행 ${String(runId)} — 조작 실패가 ${String(맡을상한)}건을 넘어 빌드나 폰이 깨진 것으로 보고 자동 수정을 안 세운다`);
    return null;
  }
  if (후보.length === 0) return null;
  const 서비스 = Number(실행.service_id);
  return 잠그고(서비스, async (손) => {
    if ((await 열린작성(서비스, 손)).length > 0) return null;
    const 넣음: 게임고침['cases'] = [];
    const 줄들: number[] = [];
    for (const c of 후보) {
      if (!(await 맡을까(손, 서비스, c.tcId, 실행.env))) continue;
      const 줄 = await 손.query<{ id: string }>(
        `INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, failed_run, failure) VALUES ($1, NULL, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING id`,
        [실행.project_id, 서비스, c.tcId, 실행.env, runId, c.failure],
      );
      if (줄.rows[0] === undefined) continue;
      줄들.push(Number(줄.rows[0].id));
      넣음.push({ runId, tcId: c.tcId, env: 실행.env, failure: c.failure });
    }
    if (넣음.length === 0) return null;
    const 번호 = await 줄세우기(
      { 서비스, kind: 'AUTHOR', 기획서: null, 값: { prdApply: true, testFix: { auto: true, cases: 넣음, note: '' }, decision: { after: [], count: 넣음.length } }, 누가: 게임수정요청자.누가, 이름: 게임수정요청자.이름 },
      손,
    );
    await 손.query('UPDATE bts_test_fix SET request_id = $2, updated_at = now() WHERE id = ANY($1::bigint[])', [줄들, 번호]);
    return 번호;
  });
}

/** 케이스 끝을 줄 끝으로 — 결과에 없는 케이스는 고쳤다는 말이 없어 그만둔다 */
function 끝나눔(x: 케이스끝 | undefined): { 끝: 'FIXED' | 'FLAKY' } | { 끝: 'GAVE_UP'; 까닭: string } {
  if (x === undefined) return { 끝: 'GAVE_UP', 까닭: '고침 결과에 이 케이스가 없어요' };
  if (x.outcome === 'NOT_FOUND') return { 끝: 'GAVE_UP', 까닭: x.note === undefined || x.note === '' ? 고칠곳없음 : `${고칠곳없음} — ${x.note}` };
  return { 끝: x.outcome };
}

/**
 * 게임 고침 작성이 PR 을 열었다 — 결과의 케이스마다 끝(result.testFix.cases)대로 줄을 나눈다.
 * FIXED 는 병합 기다림(PR · 요약), FLAKY 는 그대로 돌려 보니 통과, NOT_FOUND 는 그만둠. 결과에 없는 케이스는 고쳤다는 말이 없어 그만둔다.
 * 칸이 없으면(앞 판 에이전트) 요청의 고치는 줄 전부가 병합 기다림이다. 같은 PR 로 또 끝나도 한 번이다. 고친 케이스가 하나도 없으면 요청을 폐기한다. BTS 로 보내는 것이 없어 늘 false
 */
export async function 게임PR열림(뿌리번호: number, prUrl: string, 요약: string, 결과: unknown): Promise<boolean> {
  const 끝들 = 케이스끝읽기(결과);
  const 끝 = new Map((끝들 ?? []).map((x) => [x.tcId, x]));
  const pool = await db();
  const 줄들 = (
    await pool.query<{ id: string; tc_id: string; state: string }>(
      // 병합 전 재실행 · 이어서 작성이 다른 PR 로 끝났으면 그 PR 로 바꾼다 — 판정(testFixMerge.ts)이 새 PR 의 줄을 찾게
      `SELECT id, tc_id, state FROM bts_test_fix WHERE request_id = $1 AND issue_key IS NULL AND (state = 'FIXING' OR (state = 'WAIT_MERGE' AND merge IS NULL)) ORDER BY id`,
      [뿌리번호],
    )
  ).rows;
  for (const 줄 of 줄들) {
    const 이것 = 끝들 === null ? ({ 끝: 'FIXED' } as const) : 끝나눔(끝.get(줄.tc_id));
    if (이것.끝 === 'FIXED') {
      // PR 이 바뀌면 앞 PR 의 사람 확인 까닭 · 걸림을 비운다 — 남으면 60초 점검(판정다시)이 까닭이 찬 줄을 건너뛰어 새 PR 을 판정하지 않는다
      await pool.query(
        `UPDATE bts_test_fix SET person_why = CASE WHEN pr_url IS DISTINCT FROM $2 THEN '{}' ELSE person_why END, held = CASE WHEN pr_url IS DISTINCT FROM $2 THEN '{}' ELSE held END,
                pr_url = $2, summary = $3, state = 'WAIT_MERGE', updated_at = now() WHERE id = $1`,
        [줄.id, prUrl, 요약 === '' ? null : 요약],
      );
    } else {
      // 앞 PR 로 병합 기다림이던 줄도 새 결과대로 끝낸다
      await 게임줄끝내기([줄.id], 이것.끝 === 'FLAKY' ? 'FLAKY' : 'GAVE_UP', 이것.끝 === 'GAVE_UP' ? 이것.까닭 : null);
    }
  }
  // 고친 케이스가 하나도 없으면 PR 없이 끝난 때처럼 요청을 폐기한다 — 안 하면 열린 작성으로 남아 그 앱의 다음 작성 · 자동 수정을 막는다
  if (줄들.length > 0 && ((await pool.query('SELECT 1 FROM bts_test_fix WHERE request_id = $1 AND issue_key IS NULL AND state = ANY($2) LIMIT 1', [뿌리번호, 도는상태])).rowCount ?? 0) === 0) {
    const 최신 = (await pool.query<{ id: string }>(`WITH RECURSIVE ${사슬식('id = $1')} SELECT a.id FROM authoring_request a WHERE a.id = ${최신식('사슬')}`, [뿌리번호])).rows[0];
    if (최신 === undefined || !(await 버리기(Number(최신.id)))) console.error(`[game-fix] 요청 ${String(뿌리번호)} 를 폐기하지 못했다 — 열린 작성으로 남아 다음 작성을 막을 수 있다`);
  }
  return false;
}

/**
 * 게임 고침 작성이 PR 없이 끝났거나 실패 · 멈춤 · 폐기됐는지 보고 줄을 끝낸다 — 끝났으면 true.
 * PR 없이 DONE 은 결과의 케이스 끝대로(칸이 없으면 모두 「고칠 곳을 찾지 못했어요」), 실패 · 멈춤은 FAILED.
 * 어느 쪽이든 요청 뿌리를 서버가 폐기한다 — 끝난 작성은 폐기 전까지 열린 작성이라 그 애플리케이션의 새 작성과 다음 자동 수정을 막는다
 */
export async function 게임작성끝살피기(줄: 줄): Promise<boolean> {
  if (줄.request_id === null) {
    await 게임줄끝내기([줄.id], 'FAILED', '테스트 수정 작성이 지워졌어요');
    return true;
  }
  const pool = await db();
  const r = (
    await pool.query<{ discarded: boolean; id: string; kind: string; status: string; pr_url: string | null; result: unknown }>(
      `WITH RECURSIVE ${사슬식('id = $1')}
       SELECT (SELECT discarded_at IS NOT NULL FROM authoring_request WHERE id = $1) AS discarded, a.id, a.kind, a.status, a.pr_url, a.result
         FROM authoring_request a WHERE a.id = ${최신식('사슬')}`,
      [줄.request_id],
    )
  ).rows[0];
  if (r === undefined) return false;
  const 도는줄들 = (
    await pool.query<{ id: string; tc_id: string; state: string }>(`SELECT id, tc_id, state FROM bts_test_fix WHERE request_id = $1 AND issue_key IS NULL AND state = ANY($2) ORDER BY id`, [줄.request_id, 도는상태])
  ).rows;
  if (r.discarded) {
    await 게임줄끝내기(도는줄들.map((x) => x.id), 'FAILED', '테스트 수정 작성을 폐기했어요');
    return true;
  }
  // PR 을 연 뒤의 재실행 실패는 PR 이 그대로라 사람이 반영할 수 있다 — 끝내지 않는다
  if (줄.state !== 'FIXING') return false;
  const 고치는줄들 = 도는줄들.filter((x) => x.state === 'FIXING');
  if (r.status === 'FAILED' || r.status === 'STOPPED') {
    await 게임줄끝내기(고치는줄들.map((x) => x.id), 'FAILED', r.status === 'FAILED' ? '테스트 수정 작성이 실패했어요' : '테스트 수정 작성이 멈췄어요');
  } else if (r.status === 'DONE' && r.kind !== 'MERGE' && r.pr_url === null) {
    const 끝 = new Map((케이스끝읽기(r.result) ?? []).map((x) => [x.tcId, x]));
    for (const x of 고치는줄들) {
      // 칸이 없거나 고쳤다고 했는데 PR 이 없으면 「고칠 곳을 찾지 못했어요」다
      const 이것 = 끝.has(x.tc_id) ? 끝나눔(끝.get(x.tc_id)) : { 끝: 'GAVE_UP' as const, 까닭: 고칠곳없음 };
      await 게임줄끝내기([x.id], 이것.끝 === 'FLAKY' ? 'FLAKY' : 'GAVE_UP', 이것.끝 === 'GAVE_UP' ? 이것.까닭 : 이것.끝 === 'FIXED' ? 고칠곳없음 : null);
    }
  } else return false;
  if (!(await 버리기(Number(r.id)))) console.error(`[game-fix] 요청 ${String(줄.request_id)} 를 폐기하지 못했다 — 열린 작성으로 남아 다음 작성을 막을 수 있다`);
  return true;
}

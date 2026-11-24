// 게임 실패 자동 수정의 뒤 절반 — 반영이 끝나면 요청의 병합 기다림 줄 전부를 실행 하나로 다시 걸고, 끝나면 줄마다 PASSED · FAILED (도메인/게임 §3.10 「실패 자동 수정」 5)
// BTS 로 보내는 것이 없다. testFixRerun.ts 가 BTS 줄 대신 이쪽을 부른다 — 서로 가져오기 고리가 생기지 않게 줄 꼴만 type 으로 가져온다

import type { Platform } from '@platform/kit';
import type { Pool } from 'pg';

import { 팜을본다 } from '../execution/location.js';
import { 게임수정요청자 } from './gameFixShared.js';
import { 도는상태 } from './testFixIssue.js';
import type { 줄 } from './testFixRerun.js';
import { 디바이스이름, 막힌대상, 반영끝났나, 실행표시 } from './testFixShared.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 게임 줄을 끝낸다 — 도는 줄만. 이슈가 없어 줄 상태와 까닭만 적는다 */
export async function 게임줄끝내기(ids: (number | string)[], state: 'PASSED' | 'FAILED' | 'GAVE_UP' | 'FLAKY', 까닭: string | null): Promise<void> {
  await (await db()).query(`UPDATE bts_test_fix SET state = $2, reason = $3, updated_at = now() WHERE id = ANY($1::bigint[]) AND issue_key IS NULL AND state = ANY($4)`, [ids, state, 까닭, 도는상태]);
}

interface 재료 {
  items: { tcId: string; platforms: Platform[]; params: Record<string, unknown>; expected: Record<string, unknown> }[];
  mobileOn: 'server' | 'vision';
  rerunOf?: number;
}

/**
 * 처음 실패한 실행에서 케이스마다 그 디바이스들 — 통과하던 디바이스도 같이 다시 돌려 고치다 깨뜨리지 않았는지 본다. 실제 폰이 깨졌으면 실제 폰으로.
 * 다시 실행에 붙이는(rerunOf) 것은 모든 케이스에 실패(FAIL) 항목이 있을 때뿐이다 — 시간 초과로 미실행(NA)이 된 케이스가 끼면 실행 쪽이 거절한다(runOrigin.ts)
 */
async function 실행재료(실패실행: number, tcIds: string[]): Promise<재료 | null> {
  const pool = await db();
  const 항목 = (
    await pool.query<{ tc_id: string; platform: Platform; status: string; real: boolean }>(
      `SELECT tc_id, platform, status, device IS NOT NULL AS real FROM run_item WHERE run_id = $1 AND tc_id = ANY($2::text[]) ORDER BY tc_id, platform`,
      [실패실행, tcIds],
    )
  ).rows;
  if (항목.length === 0) return null;
  const 실패있음 = tcIds.every((t) => 항목.some((i) => i.tc_id === t && i.status === 'FAIL'));
  return {
    items: tcIds.map((tcId) => ({ tcId, platforms: [...new Set(항목.filter((i) => i.tc_id === tcId).map((i) => i.platform))], params: {}, expected: {} })),
    mobileOn: 항목.some((i) => i.platform === 'mobile' && i.status !== 'PASS' && i.real) ? 'vision' : 'server',
    ...(실패있음 && { rerunOf: 실패실행 }),
  };
}

/**
 * 반영이 끝난 요청의 병합 기다림 게임 줄 전부를 한 번에 차지하고 실행 하나로 건다. 반영 끝 알림과 60초 점검이 같이 와도 먼저 차지한 쪽만 건다.
 * 디바이스 팜이 필요한데 없으면 줄을 실패로 끝낸다 — 폰이 다른 실행에 쓰이는 중이면 보통 실행처럼 차례를 기다린다
 */
export async function 게임다시걸기(요청번호: number | string): Promise<void> {
  if (!(await 반영끝났나(String(요청번호)))) return;
  const pool = await db();
  const 줄들 = (
    await pool.query<{ id: string; tc_id: string; env: string; failed_run: string | null }>(
      `UPDATE bts_test_fix SET state = 'RERUNNING', updated_at = now()
        WHERE request_id = $1 AND issue_key IS NULL AND state = 'WAIT_MERGE'
        RETURNING id, tc_id, env, failed_run`,
      [요청번호],
    )
  ).rows;
  if (줄들[0] === undefined) return;
  const ids = 줄들.map((r) => r.id);
  const 실패실행 = 줄들[0].failed_run === null ? null : Number(줄들[0].failed_run);
  const 거둠 = 실패실행 === null ? null : await 실행재료(실패실행, 줄들.map((r) => r.tc_id));
  if (거둠 === null) return 게임줄끝내기(ids, 'FAILED', '처음 실패한 실행이 지워져 다시 실행하지 못했어요');
  if (팜을본다(거둠.items, process.env, 거둠.mobileOn) !== null) return 게임줄끝내기(ids, 'FAILED', '실제 폰을 못 잡아 확인하지 못했어요');
  try {
    // 실행 쪽이 bts 를 가져오므로(실행 끝 실패 등록) 부를 때 가져온다
    const { createRun } = await import('../execution/store.js');
    const { dispatch } = await import('../execution/dispatcher.js');
    const 실행 = await createRun({ origin: 'MANUAL', env: 줄들[0].env, triggeredBy: 게임수정요청자.누가, triggeredByName: 게임수정요청자.이름, ...거둠 });
    // 분배 전에 적는다 — 실행 끝 뒷일이 이 실행을 건너뛰고 끝 판정이 이 줄들을 찾게
    await pool.query('UPDATE bts_test_fix SET rerun_id = $2, updated_at = now() WHERE id = ANY($1::bigint[])', [ids, 실행.runId]);
    void dispatch(실행.runId, 실행.items).catch((err: unknown) => console.error(`[game-fix] 요청 ${String(요청번호)} 다시 실행 ${String(실행.runId)} 분배가 깨졌다: ${String(err)}`));
  } catch (err) {
    console.error(`[game-fix] 요청 ${String(요청번호)} 다시 실행을 걸지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    await 게임줄끝내기(ids, 'FAILED', '다시 실행을 걸지 못했어요');
  }
}

/** 다시 실행이 끝난 줄 — 그 케이스 항목이 모두 통과면 PASSED, 아니면 FAILED 와 못 통과한 디바이스 */
export async function 게임끝보기(줄: 줄): Promise<void> {
  if (줄.state !== 'RERUNNING') return;
  // 같은 요청의 줄들이 실행 번호를 받기 전이다 — 10분 넘게 서 있으면 실행이 안 걸린 것으로 보고 기록 없음으로 끝낸다
  if (줄.rerun_id === null && !줄.stale) return;
  const pool = await db();
  const 실행 =
    줄.rerun_id === null
      ? undefined
      : (await pool.query<{ run_id: string; status: string; origin: string; rerun_of: string | null; prep_note: string | null }>('SELECT run_id, status, origin, rerun_of, prep_note FROM test_run WHERE run_id = $1', [줄.rerun_id])).rows[0];
  if (실행?.status === 'RUNNING') return;
  const 항목 =
    실행 === undefined
      ? []
      : (
          await pool.query<{ platform: string; status: string; real: boolean; message: string | null; blocked_by: string | null }>(
            `SELECT platform, status, device IS NOT NULL AS real, error->>'message' AS message, blocked_by FROM run_item WHERE run_id = $1 AND tc_id = $2 ORDER BY platform DESC`,
            [줄.rerun_id, 줄.tc_id],
          )
        ).rows;
  const 통과 = 항목.length > 0 && 항목.every((i) => i.status === 'PASS');
  if (통과) return 게임줄끝내기([줄.id], 'PASSED', null);
  // 고친 테스트가 틀린 것이 아니라 데이터 준비가 안 됐다 — 스스로 다시 걸지 않는다
  if (실행?.status === 'PREP_FAILED') {
    const 까닭 = '테스트 데이터 준비에 실패해 확인하지 못했어요. 고친 테스트는 반영됐어요 — 준비가 되면 그 테스트를 다시 실행해 주세요';
    return 게임줄끝내기([줄.id], 'FAILED', 실행.prep_note === null ? 까닭 : `${까닭}\n${실행.prep_note}`);
  }
  // 고친 케이스가 앞 케이스에 막혔으면 다시 고치지 않고 사람에게 넘기되 막은 케이스를 적는다 (도메인/게임 §3.10 「실패 자동 수정」 5)
  const 막음 = 막힌대상(항목);
  if (막음 !== null && 실행 !== undefined) return 게임줄끝내기([줄.id], 'FAILED', `선행 케이스 ${막음} 가 통과하지 못해 확인하지 못했어요 · ${실행표시(실행)}`);
  const 디바이스 = [...new Set(항목.filter((i) => i.status !== 'PASS').map((i) => 디바이스이름(i.platform, i.real)))].join(' · ');
  await 게임줄끝내기([줄.id], 'FAILED', 실행 === undefined || 항목.length === 0 ? '다시 실행 기록이 없어 확인하지 못했어요' : `${디바이스} 에서 통과하지 못했어요 · ${실행표시(실행)}`);
}

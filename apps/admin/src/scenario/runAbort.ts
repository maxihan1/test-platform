// E2E 정식 실행 중단 — 러너에 보냈는지 · 멈췄는지를 들고, 보내기 전이면 admin 이 닫고 보낸 뒤면 러너가 끊는다 (SPEC 도메인/실행 §3.2 「E2E 도 지금 단계를 알리고 끊는다」)

import type { Pool } from 'pg';

import { abortScenarioRunner } from '../execution/scenarioRunner.js';

import type { 시험상태 } from './trialAbort.js';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. CI 는 DB 없이 돌아야 하므로 쓸 때 가져온다
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// admin 메모리에만 산다. 분배가 도는 동안만 있고 admin 이 다시 뜨면 사라진다 — 남은 실행은 재기동 복구가 닫는다
const 상태들 = new Map<number, 시험상태>();

export function 실행상태를연다(runId: number, 부품수: number): 시험상태 {
  const 상태: 시험상태 = { 보냄: false, 멈춤: false, 부품수 };
  상태들.set(runId, 상태);
  return 상태;
}

export const 실행상태를지운다 = (runId: number): void => void 상태들.delete(runId);

// 보내기 전이라 어느 부품도 안 돌았다 — 전부 'NOT_RUN'(화면 「실행 안 함」)이다. 'ABORTED' 는 재기동 복구 몫이라 쓰지 않는다 (도메인/시나리오 §8.11)
async function 보내기전에닫는다(runId: number): Promise<boolean> {
  const c = await (await db()).connect();
  try {
    await c.query('BEGIN');
    const 닫힘 = await c.query(
      "UPDATE test_run SET status = 'ABORTED', finished_at = now() WHERE run_id = $1 AND kind = 'SCENARIO' AND status = 'RUNNING'",
      [runId],
    );
    if (닫힘.rowCount === 0) {
      await c.query('ROLLBACK');
      return false;
    }
    await c.query(
      `UPDATE scenario_run_part SET status = 'NA', duration_ms = COALESCE(duration_ms, 0), error = jsonb_build_object('message', 'NOT_RUN'), finished_at = now()
        WHERE run_id = $1 AND finished_at IS NULL`,
      [runId],
    );
    await c.query('COMMIT');
    return true;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

/**
 * 도는 시나리오 실행을 멈춘다. 돌려주는 값이 null 이면 멈출 것이 없다(이미 끝났거나 이미 멈췄다 — 부르는 쪽이 409 를 낸다).
 * 보내기 전(줄 · 폰을 기다리는 중)이면 바로 ABORTED 로 닫고 러너에 보내지 않는다. 보낸 뒤면 러너에 끊어 달라고만 한다 —
 * 실행은 러너가 끊고 돌려준 답(error.message 'ABORTED')을 보고 결과 저장(runResult.ts)이 ABORTED 로 닫는다. aborted 는 시나리오가 한 덩이라 1 이다
 */
export async function 시나리오실행을멈춘다(runId: number): Promise<{ aborted: number } | null> {
  const 상태 = 상태들.get(runId);
  if (상태 === undefined || 상태.멈춤) return null;
  if (!상태.보냄) {
    // 보냈는지 보고 멈춤을 적는 사이에 await 가 없다 — 보내는 길이 멈춤을 한 번 더 본다
    상태.멈춤 = true;
    return (await 보내기전에닫는다(runId)) ? { aborted: 1 } : null;
  }
  // 러너가 끊었다고 해야 멈춘 것이다 — 「멈춤」을 admin 이 먼저 적으면 답이 오는 중이던 다 통과한 실행도 ABORTED 로 닫혔다 (WEB-F9-14 끝 검사).
  // ponytail: 보낸 직후 러너가 그 번호를 받기 전(/health 확인 · 전송 — 2초 안쪽)이면 false 라 409 다. 케이스 시험 실행 중단도 같은 틈이 있다
  return (await abortScenarioRunner({ scenarioRunId: runId })) ? { aborted: 1 } : null;
}

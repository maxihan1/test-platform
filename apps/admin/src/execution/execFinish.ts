// 프로시저 실행 단위의 시작과 끝을 적는다 — 러너 답을 케이스 줄 여럿에 한 트랜잭션으로 저장한다 (SPEC 도메인/실행 §3.2 「테스트 프로시저 실행」 · 공통/4 「테스트 프로시저 표」)
// runLifecycle.ts 가 300줄을 넘어 여기 둔다. 케이스 줄 하나를 닫는 규칙은 옛 꼴과 같은 함수다

import type { CaseResult, CasesExecuteResponse } from '@platform/kit';

import type { Pool } from 'pg';

import { jsonb에맞춘다 } from '../jsonbText.js';

import { 케이스줄을닫는다 } from './runLifecycle.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 실행 단위에 러너로 보낸 때를 적는다. 대기줄 · 디바이스 줄에서 기다린 시간은 안 든다 (공통/4 「테스트 프로시저 표」 run_exec.started_at) */
export async function 실행단위를시작한다(execId: number): Promise<void> {
  await (await db()).query('UPDATE run_exec SET started_at = now() WHERE exec_id = $1 AND started_at IS NULL', [execId]);
}

const 답없음 = '러너 답에 이 케이스의 결과가 없습니다';

/**
 * 프로시저 실행 단위의 답을 한 트랜잭션으로 저장한다 — 케이스 줄마다 그 케이스의 결과를 적고 실행 단위를 닫는다.
 * 기기 정보는 모든 줄에 같은 값을 넣고 FPS 는 표본의 절차 번호로 케이스에 가른다. 판정 밖의 사유(답 맨 위 error)는 실행 단위에 적는다.
 * 닫는 규칙은 케이스 줄마다 그대로다 — 멈춰서 이미 닫힌 줄은 건드리지 않는다 (도메인/실행 §3.2 「테스트 프로시저 실행」 · 공통/4 「테스트 프로시저 표」)
 */
export async function finishExec(execId: number, 받은답: CasesExecuteResponse): Promise<void> {
  const 답 = jsonb에맞춘다(받은답);
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    const 줄들 = await client.query<{ history_id: string; tc_id: string }>('SELECT history_id, tc_id FROM run_item WHERE exec_id = $1 ORDER BY exec_seq', [execId]);
    let 닫은 = 0;
    for (const 줄 of 줄들.rows) {
      const historyId = Number(줄.history_id);
      // 러너는 요청의 케이스마다 한 건을 답한다. 그래도 빠진 줄을 열어 두면 실행이 재기동 때까지 안 끝난다 — 판정할 근거가 없으니 미실행이다
      const 것: CaseResult = 답.results.find((r) => r.tcId === 줄.tc_id) ?? { tcId: 줄.tc_id, status: 'NA', durationMs: 0, steps: [], error: 답.error ?? { message: 답없음 } };
      const 절차들 = new Set(것.steps.map((s) => s.seq));
      const 닫힘 = await 케이스줄을닫는다(client, historyId, {
        ...것,
        historyId,
        ...(답.device !== undefined && { device: 답.device }),
        ...(답.fps !== undefined && { fps: 답.fps.filter((f) => 절차들.has(f.seq)) }),
      });
      if (닫힘) 닫은 += 1;
    }
    if (닫은 === 0) {
      await client.query('ROLLBACK');
      return;
    }
    await client.query('UPDATE run_exec SET finished_at = now(), error = $2 WHERE exec_id = $1 AND finished_at IS NULL', [
      execId,
      답.error === undefined ? null : JSON.stringify(답.error),
    ]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

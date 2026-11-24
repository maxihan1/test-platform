// 프로시저 실행 단위의 시작과 끝을 적는다 — 러너 답을 케이스 줄 여럿에 한 트랜잭션으로 저장한다 (SPEC 도메인/실행 §3.2 「테스트 프로시저 실행」 · 공통/4 「테스트 프로시저 표」)
// runLifecycle.ts 가 300줄을 넘어 여기 둔다. 케이스 줄 하나를 닫는 규칙은 옛 꼴과 같은 함수다

import type { CaseResult, ExecuteResponse, FpsSample } from '@platform/kit';

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
 * 러너가 1초마다 읽은 FPS 표본을 케이스에 가른다 — 표본의 절차 번호가 그 케이스의 첫 절차 번호부터 다음 케이스의 첫 절차 앞까지면 그 케이스 것이다.
 * 절차 번호가 같은 것만 고르면 한도에 끊겨 결과에 안 실린 절차의 표본이 어느 줄에도 안 남는다 — 게임이 멈춘 바로 그 구간이다
 */
export function FPS를가른다(답: Pick<ExecuteResponse, 'results' | 'fps'>): Map<string, FpsSample[]> {
  const 모음 = new Map<string, FpsSample[]>();
  if (!Array.isArray(답.fps)) return 모음;
  // 절차가 없는 케이스(못 간 케이스)는 표본을 받지 않는다. 뒤에서부터 찾게 첫 절차 번호가 큰 것부터 둔다
  const 첫절차 = 답.results.flatMap((r) => (r.steps.length === 0 ? [] : [{ tcId: r.tcId, 첫: Math.min(...r.steps.map((s) => s.seq)) }])).sort((a, b) => b.첫 - a.첫);
  for (const 표본 of 답.fps) {
    const 주인 = 첫절차.find((c) => c.첫 <= 표본.seq) ?? 첫절차.at(-1);
    if (주인 !== undefined) 모음.set(주인.tcId, [...(모음.get(주인.tcId) ?? []), 표본]);
  }
  return 모음;
}

/**
 * 프로시저 실행 단위의 답을 한 트랜잭션으로 저장한다 — 케이스 줄마다 그 케이스의 결과를 적고 실행 단위를 닫는다.
 * 기기 정보는 모든 줄에 같은 값을 넣고 FPS 는 표본의 절차 번호로 케이스에 가른다. 판정 밖의 사유(답 맨 위 error)는 실행 단위에 적는다 —
 * 러너에 못 보내고 닫을 때의 사유(폰을 못 잡았다 · 러너에 못 닿았다 · 결과를 못 저장했다)도 판정 밖이라 같이 적힌다.
 * 닫는 규칙은 케이스 줄마다 그대로다 — 멈춰서 이미 닫힌 줄은 건드리지 않는다 (도메인/실행 §3.2 「테스트 프로시저 실행」 · 공통/4 「테스트 프로시저 표」)
 */
export async function finishExec(execId: number, 받은답: ExecuteResponse): Promise<void> {
  const 답 = jsonb에맞춘다(받은답);
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    // 멈추기(abortRun)는 실행 줄을 잡고 안 끝난 케이스 줄을 한 문장으로 닫는다. 여기는 줄을 하나씩 닫아, 실행 줄을 먼저 같이 잡지 않으면
    // 둘이 케이스 줄을 엇갈려 쥐고 서로 기다릴 수 있다(멈추기가 죽으면 실행이 RUNNING 에 남는다). 다른 실행 단위의 저장은 서로 안 막는다
    const 실행 = await client.query<{ run_id: string }>('SELECT r.run_id FROM run_exec e JOIN test_run r ON r.run_id = e.run_id WHERE e.exec_id = $1 FOR SHARE OF r', [execId]);
    // run_item 에는 exec_id 색인이 없다 — 같은 실행의 줄로 좁혀 읽는다
    const 줄들 = await client.query<{ history_id: string; tc_id: string }>('SELECT history_id, tc_id FROM run_item WHERE run_id = $2 AND exec_id = $1 ORDER BY exec_seq', [
      execId,
      실행.rows[0]?.run_id ?? null,
    ]);
    const 표본들 = FPS를가른다(답);
    let 닫은 = 0;
    for (const 줄 of 줄들.rows) {
      const historyId = Number(줄.history_id);
      // 러너는 요청의 케이스마다 한 건을 답한다. 그래도 빠진 줄을 열어 두면 실행이 재기동 때까지 안 끝난다 — 판정할 근거가 없으니 미실행이다
      const 것: CaseResult = 답.results.find((r) => r.tcId === 줄.tc_id) ?? { tcId: 줄.tc_id, status: 'NA', durationMs: 0, steps: [], error: { message: 답없음 } };
      const 닫힘 = await 케이스줄을닫는다(client, historyId, {
        ...것,
        historyId,
        ...(답.device !== undefined && { device: 답.device }),
        ...(표본들.has(줄.tc_id) && { fps: 표본들.get(줄.tc_id)! }),
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

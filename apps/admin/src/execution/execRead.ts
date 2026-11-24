// 케이스 줄에서 그 줄이 든 실행 단위를 찾아 읽는다 — 장면 · 폰 화면 · 증적 폴더 · 비밀값 가리기는 실행 단위에 한 벌이다
// (SPEC 도메인/실행 §3.2 「테스트 프로시저 실행」 「한도 · 폰」 · 공통/4 「테스트 프로시저 표」)

import type { Pool } from 'pg';

import { 긴것부터, 항목비밀 } from './trial.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/**
 * 케이스 줄이 든 실행 단위의 번호와, 그 실행 단위의 케이스가 모두 통과했나. 러너에 가는 번호 · 장면 열쇠 · 폴더(`artifacts/runs/{runId}/{번호}/`)가 이 번호다.
 * 옛 꼴 케이스는 케이스 줄 번호와 같고 실행 단위 칸 전의 줄도 케이스 줄 번호다. 통과가 아닌 케이스가 하나라도 있으면 러너가 영상 · logcat 을 남긴다.
 * 그 실행의 줄이 아니면 null — 주소의 runId 로 문이 권한을 봤으니 남의 실행 것이 새지 않게 한다
 */
export async function 실행단위자리(runId: number, historyId: number): Promise<{ 번호: number; 통과: boolean } | null> {
  const r = await (await db()).query<{ 번호: string; 통과: boolean }>(
    `SELECT COALESCE(i.exec_id, i.history_id) AS "번호",
            i.status = 'PASS' AND NOT EXISTS (SELECT 1 FROM run_item x WHERE x.exec_id = i.exec_id AND x.status <> 'PASS') AS "통과"
       FROM run_item i WHERE i.run_id = $1 AND i.history_id = $2`,
    [runId, historyId],
  );
  const 줄 = r.rows[0];
  return 줄 === undefined ? null : { 번호: Number(줄.번호), 통과: 줄.통과 };
}

/**
 * 실행 단위마다 그 케이스 줄 전부의 비밀 글자 — 한 케이스의 사유 글 · 절차 기록에 같은 프로세스에서 돈 다른 케이스의 비밀값이 되비칠 수 있다.
 * 프로시저 줄을 가릴 때 항목비밀 대신 쓴다. 옛 꼴 케이스는 줄이 하나라 항목비밀과 같다 (공통/4 「테스트 프로시저 표」)
 */
export async function 단위비밀들(execIds: readonly number[]): Promise<Map<number, string[]>> {
  const 모음 = new Map<number, string[]>();
  if (execIds.length === 0) return 모음;
  const r = await (await db()).query<{ exec_id: string; params: unknown; expected: unknown; param_schema: unknown; expected_schema: unknown }>(
    'SELECT exec_id, params, expected, param_schema, expected_schema FROM run_item WHERE exec_id = ANY($1::bigint[])',
    [execIds],
  );
  for (const row of r.rows) 모음.set(Number(row.exec_id), [...(모음.get(Number(row.exec_id)) ?? []), ...항목비밀(row)]);
  for (const [번호, 글자들] of 모음) 모음.set(번호, 긴것부터([...new Set(글자들)]));
  return 모음;
}

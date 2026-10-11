// 「화면이 맞음」 반영 본문을 읽고 실행 · 지도로 params.screenRight 를 채운다 (도메인/작성 §7 apply 「본문 screenRight」 · §3.6 「화면이 맞음」)
// 리포팅은 작성 요청을 직접 쓰지 않는다 — 실패 카드 버튼이 이 반영 통로를 부르고, 실행 표는 여기서 읽기만 한다 (도메인/리포팅 「실패 요구사항」)

import { z } from 'zod';

import { TCID } from '../catalog/rules.js';
import { 종류조건 } from '../execution/runKind.js';
import { 지금판 } from './store.js';

/** 작성 요청 params.screenRight — env 는 그 실행의 대상 서버, reqIds 는 그 케이스가 덮는 번호 가운데 지금 판에 있는 것(판 차례) */
export interface 화면이맞음 {
  runId: number;
  tcId: string;
  env: string;
  reqIds: string[];
}

// 빈 본문 · {} 는 보통 반영이다 — 「PRD 관리」 버튼이 json({}) 를 보낸다
const 본문꼴 = z.union([
  z.object({}).strict(),
  z.object({ screenRight: z.object({ runId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), tcId: z.string().regex(TCID) }).strict() }).strict(),
]);

/** 본문을 읽는다. 꼴이 틀리면 null — 라우트가 400 INVALID_REQUEST 로 돌려보낸다 */
export function 반영본문(body: unknown): { screenRight?: { runId: number; tcId: string } } | null {
  const r = 본문꼴.safeParse(body ?? {});
  return r.success ? r.data : null;
}

type 채움오류 =
  | { code: 404; error: 'RUN_NOT_FOUND' }
  | { code: 409; error: 'RUN_NOT_FINISHED' }
  | { code: 400; error: 'NOT_FAILED' }
  | { code: 409; error: 'NO_PRD_REQ' };

/**
 * 실행이 있고 같은 서비스의 케이스 실행이며 끝났고, 그 케이스의 실패 항목이 있으면 params.screenRight 를 채운다.
 * 시나리오 실행 · 남의 서비스 실행은 없는 실행으로 본다 — 번호로 남의 실행 결과를 떠보지 못하게(리포팅 실행 조회와 같은 규칙)
 */
export async function 화면이맞음채우기(서비스: number, runId: number, tcId: string): Promise<화면이맞음 | 채움오류> {
  const { pool } = await import('../db/index.js');
  const 실행 = await pool.query<{ status: string; env: string; 실패: boolean }>(
    `SELECT status, env,
            EXISTS (SELECT 1 FROM run_item WHERE run_id = $1 AND tc_id = $3 AND status = 'FAIL') AS "실패"
       FROM test_run WHERE run_id = $1 AND service_id = $2 AND ${종류조건('case', '')}`,
    [runId, 서비스, tcId],
  );
  const 행 = 실행.rows[0];
  if (행 === undefined) return { code: 404, error: 'RUN_NOT_FOUND' };
  if (행.status === 'RUNNING') return { code: 409, error: 'RUN_NOT_FINISHED' };
  if (!행.실패) return { code: 400, error: 'NOT_FAILED' };
  const [판, 지도] = await Promise.all([
    지금판(서비스),
    pool.query<{ req_id: string }>('SELECT DISTINCT req_id FROM req_case WHERE service_id = $1 AND tc_id = $2', [서비스, tcId]),
  ]);
  const 덮는 = new Set(지도.rows.map((x) => x.req_id));
  const reqIds = (판?.items ?? []).map((x) => x.reqId).filter((번호) => 덮는.has(번호));
  if (reqIds.length === 0) return { code: 409, error: 'NO_PRD_REQ' };
  return { runId, tcId, env: 행.env, reqIds };
}

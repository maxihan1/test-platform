// 실행 결과의 실패를 표준 기획서 요구로 모으고, 케이스마다 「화면이 맞음」 · 「버그」 판정을 읽는다 (도메인/리포팅 「실패 요구사항」)
// 지금 지도 ① · 지금 판으로 세고 박제하지 않는다 — 읽기 전용이다. 쓰는 곳은 버그 남기기 하나(run_case_bug)

import type { PrdItem } from '@platform/kit';
import type { Pool } from 'pg';

import { 맥락짓기 } from '../catalog/context.js';
import { 종류조건 } from '../execution/runKind.js';
import { 화면목록식 } from '../prd/screenRight.js';
import { 지금판 } from '../prd/store.js';
import { db } from './insights.js';

export interface 카드요구 {
  reqId: string;
  text: string | null;
}

export type 판정 =
  | { kind: 'SCREEN'; requestId: number; byName: string; at: string }
  | { kind: 'BUG'; byName: string; at: string }
  | null;

/** 그 실행 서비스의 지도 ① 에서 tcIds 가 덮는 요구 */
async function 요구읽기(pool: Pool, runId: number, tcIds: string[]) {
  const 서비스 = await pool.query<{ service_id: string }>(
    // 시나리오 실행 번호로 서비스를 읽지 않게 — 다른 단건 실행 조회와 같은 거르기다
    `SELECT service_id FROM test_run WHERE run_id = $1 AND service_id IS NOT NULL AND ${종류조건('case', '')}`,
    [runId],
  );
  const 서비스번호 = 서비스.rows[0]?.service_id;
  const 판: PrdItem[] = [];
  const 행들: { reqId: string; tcId: string; axis: '정상' | '경계' | '예외' | 'UI' }[] = [];
  if (서비스번호 !== undefined && tcIds.length > 0) {
    // 지금 판은 「PRD 관리」와 같은 함수로 읽는다 — 정의가 두 벌이면 칸 · 고리가 메뉴와 어긋난다
    const [판행, 요구행] = await Promise.all([
      지금판(Number(서비스번호)),
      pool.query<{ req_id: string; tc_id: string; axis: '정상' | '경계' | '예외' | 'UI' }>(
        'SELECT req_id, tc_id, axis FROM req_case WHERE service_id = $1 AND tc_id = ANY($2)',
        [서비스번호, tcIds],
      ),
    ]);
    판.push(...(판행?.items ?? []));
    행들.push(...요구행.rows.map((r) => ({ reqId: r.req_id, tcId: r.tc_id, axis: r.axis })));
  }
  // 맥락짓기는 카탈로그 목록과 같은 차례 · 문장 규칙이다 — 화면 조각은 쓰지 않으므로 비워 넘긴다
  const 표 = 맥락짓기({ prd: 판, reqs: 행들, screens: [] });
  return { 표 };
}

/** 케이스가 덮는 요구를 번호 하나에 한 줄로(축이 달라도) 낸다 */
function 한줄씩(표: Awaited<ReturnType<typeof 요구읽기>>['표'], tcId: string): 카드요구[] {
  const 본 = new Set<string>();
  const 줄: 카드요구[] = [];
  for (const r of 표.get(tcId)?.reqs ?? []) {
    if (본.has(r.reqId)) continue;
    본.add(r.reqId);
    줄.push({ reqId: r.reqId, text: r.text });
  }
  return 줄;
}

/** failures 카드의 reqs · judgment 재료 — 쪽에 든 케이스만 묻는다 */
export async function 카드요구들(runId: number, tcIds: string[]): Promise<Map<string, 카드요구[]>> {
  const pool = await db();
  const { 표 } = await 요구읽기(pool, runId, tcIds);
  return new Map(tcIds.map((tcId) => [tcId, 한줄씩(표, tcId)]));
}

/** SCREEN 이 BUG 를 이긴다. 폐기한 작성 요청은 판정으로 치지 않는다 */
export async function 판정들(runId: number, tcIds: string[]): Promise<Map<string, 판정>> {
  const 결과 = new Map<string, 판정>(tcIds.map((tcId) => [tcId, null]));
  if (tcIds.length === 0) return 결과;
  const pool = await db();
  const [버그, 화면] = await Promise.all([
    pool.query<{ tc_id: string; marked_by_name: string; marked_at: Date }>(
      'SELECT tc_id, marked_by_name, marked_at FROM run_case_bug WHERE run_id = $1 AND tc_id = ANY($2)',
      [runId, tcIds],
    ),
    // 재실행(RERUN)도 원본의 screenRight 를 물려받으므로 같은 판정이다. 대기 반영에 더한 칸은 누른 사람 · 때를 칸에 따로 단다 (PRD-F9-20)
    pool.query<{ id: string; tc_id: string; by_name: string; at: Date }>(
      `SELECT DISTINCT ON (칸->>'tcId')
              r.id, 칸->>'tcId' AS tc_id, COALESCE(칸->>'byName', r.requested_by_name) AS by_name,
              COALESCE((칸->>'at')::timestamptz, r.created_at) AS at
         FROM authoring_request r CROSS JOIN LATERAL jsonb_array_elements(${화면목록식('r.params')}) 칸
        WHERE r.discarded_at IS NULL AND r.kind IN ('AUTHOR', 'RERUN')
          AND 칸->>'runId' = $1 AND 칸->>'tcId' = ANY($2)
        ORDER BY 칸->>'tcId', COALESCE((칸->>'at')::timestamptz, r.created_at) DESC, r.created_at DESC, r.id DESC`,
      [String(runId), tcIds],
    ),
  ]);
  for (const r of 버그.rows) 결과.set(r.tc_id, { kind: 'BUG', byName: r.marked_by_name, at: r.marked_at.toISOString() });
  for (const r of 화면.rows) {
    결과.set(r.tc_id, { kind: 'SCREEN', requestId: Number(r.id), byName: r.by_name, at: r.at.toISOString() });
  }
  return 결과;
}

export type 버그결과 = { byName: string; at: string } | 'NOT_FAILED';

/** 「버그」 한 줄을 남긴다. 이미 있으면 처음 것을 그대로 돌려준다. 결정 진행은 자기 트랜잭션(`손`) 안에서 부른다 (작성 §3.6 「★ 결정 목록」 진행 1) */
export async function 버그남기기(
  runId: number,
  tcId: string,
  누가: { username: string; displayName: string },
  손?: Pick<Pool, 'query'>,
): Promise<버그결과> {
  const pool = 손 ?? (await db());
  const 실패 = await pool.query(`SELECT 1 FROM run_item WHERE run_id = $1 AND tc_id = $2 AND status = 'FAIL' LIMIT 1`, [runId, tcId]);
  if (실패.rowCount === 0) return 'NOT_FAILED';
  await pool.query(
    `INSERT INTO run_case_bug (run_id, tc_id, marked_by, marked_by_name) VALUES ($1, $2, $3, $4)
     ON CONFLICT (run_id, tc_id) DO NOTHING`,
    [runId, tcId, 누가.username, 누가.displayName],
  );
  const { rows } = await pool.query<{ marked_by_name: string; marked_at: Date }>(
    'SELECT marked_by_name, marked_at FROM run_case_bug WHERE run_id = $1 AND tc_id = $2',
    [runId, tcId],
  );
  const 행 = rows[0]!;
  return { byName: 행.marked_by_name, at: 행.marked_at.toISOString() };
}

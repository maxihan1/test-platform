// 실행 결과의 실패를 표준 기획서 요구로 모으고, 케이스마다 「화면이 맞음」 · 「버그」 판정을 읽는다 (도메인/리포팅 「실패 요구사항」)
// 지금 지도 ① · 지금 판으로 세고 박제하지 않는다 — 읽기 전용이다. 쓰는 곳은 버그 남기기 하나(run_case_bug)

import type { PrdItem } from '@platform/kit';
import type { Pool } from 'pg';

import { 맥락짓기 } from '../catalog/context.js';
import { 지금판 } from '../prd/store.js';
import { db } from './insights.js';

export interface 실패요구 {
  reqId: string;
  /** 표준 기획서 지금 판에 없는 번호면 null */
  text: string | null;
  tcIds: string[];
}

export interface 카드요구 {
  reqId: string;
  text: string | null;
}

export type 판정 =
  | { kind: 'SCREEN'; requestId: number; byName: string; at: string }
  | { kind: 'BUG'; byName: string; at: string }
  | null;

// 회차를 접어도 어느 한 회차라도 FAIL 이면 그 (케이스, 디바이스)는 FAIL 이다 — 접는 규칙(insights 의 판정접기식)과 같은 결과라 접지 않고 묻는다
async function 실패케이스들(pool: Pool, runId: number): Promise<string[]> {
  const { rows } = await pool.query<{ tc_id: string }>(
    `SELECT DISTINCT tc_id FROM run_item WHERE run_id = $1 AND status = 'FAIL' ORDER BY tc_id`,
    [runId],
  );
  return rows.map((r) => r.tc_id);
}

/** 그 실행 서비스의 지도 ① 에서 tcIds 가 덮는 요구. 번호 차례는 지금 판 차례다 */
async function 요구읽기(pool: Pool, runId: number, tcIds: string[]) {
  const 서비스 = await pool.query<{ service_id: string }>(
    'SELECT service_id FROM test_run WHERE run_id = $1 AND service_id IS NOT NULL',
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
  return { 표, 차례: new Map(판.map((x, i) => [x.reqId, i])) };
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

/** insights 의 실패요구들 — 이 실행에서 한 번이라도 실패한 케이스를 요구로 모은다. 미확정 실패도 든다 */
export async function 실패요구들(runId: number): Promise<실패요구[]> {
  const pool = await db();
  const tcIds = await 실패케이스들(pool, runId);
  const { 표, 차례 } = await 요구읽기(pool, runId, tcIds);

  const 모음 = new Map<string, 실패요구>();
  for (const tcId of tcIds) {
    for (const r of 한줄씩(표, tcId)) {
      const 칸 = 모음.get(r.reqId) ?? { reqId: r.reqId, text: r.text, tcIds: [] };
      칸.tcIds.push(tcId);
      모음.set(r.reqId, 칸);
    }
  }
  // 판에 없는 번호(옛 표의 원본 번호)는 판 번호 뒤에 번호 차례로 간다
  return [...모음.values()].sort(
    (a, b) => (차례.get(a.reqId) ?? Infinity) - (차례.get(b.reqId) ?? Infinity) || a.reqId.localeCompare(b.reqId),
  );
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
    // 재실행(RERUN)도 원본의 screenRight 를 물려받으므로 같은 판정이다
    pool.query<{ id: string; tc_id: string; requested_by_name: string; created_at: Date }>(
      `SELECT DISTINCT ON (params->'screenRight'->>'tcId')
              id, params->'screenRight'->>'tcId' AS tc_id, requested_by_name, created_at
         FROM authoring_request
        WHERE discarded_at IS NULL AND kind IN ('AUTHOR', 'RERUN')
          AND params->'screenRight'->>'runId' = $1 AND params->'screenRight'->>'tcId' = ANY($2)
        ORDER BY params->'screenRight'->>'tcId', created_at DESC, id DESC`,
      [String(runId), tcIds],
    ),
  ]);
  for (const r of 버그.rows) 결과.set(r.tc_id, { kind: 'BUG', byName: r.marked_by_name, at: r.marked_at.toISOString() });
  for (const r of 화면.rows) {
    결과.set(r.tc_id, { kind: 'SCREEN', requestId: Number(r.id), byName: r.requested_by_name, at: r.created_at.toISOString() });
  }
  return 결과;
}

export type 버그결과 = { byName: string; at: string } | 'NOT_FAILED';

/** 「버그」 한 줄을 남긴다. 이미 있으면 처음 것을 그대로 돌려준다 */
export async function 버그남기기(runId: number, tcId: string, 누가: { username: string; displayName: string }): Promise<버그결과> {
  const pool = await db();
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

// 대조가 병합되면 기획서에 없는 화면을 작성하는 두 번째 요청을 세운다 (도메인/작성 §3.6 「기획서에 없는 화면 — 두 번째 작성」)

import type { PoolClient } from 'pg';

import { 이어작성상태읽기 } from './continue.js';
import { 밖화면뿌리 } from './params.js';
import { db } from './store.js';

/**
 * 병합이 끝난 대조 뿌리에서 화면만 요청(params.uncoveredOf) 하나를 곧장 대기로 세운다. 끝내기와 같은 트랜잭션(뿌리 잠금) 안에서 부른다.
 * 병합 전에 세우면 두 PR 이 같은 요구사항 표를 따로 고치고, 남은 요구가 있으면 화면 기준 케이스가 기획서 기준 케이스를 앞지른다 — 안 세운다.
 * 대상 서버는 다시 판정하지 않는다: 그 사이 줄이 바뀌었으면 에이전트가 집을 때 실패로 끝내 사람이 그 요청에서 본다.
 * 실패는 삼키지 않는다 — 던지면 끝내기 트랜잭션째 실패해 에이전트가 다시 알린다
 */
export async function 기획서밖화면세우기(손: PoolClient, 뿌리번호: number): Promise<{ id: number } | null> {
  const 뿌리 = await 손.query<{
    service_id: string;
    requested_by: string;
    requested_by_name: string;
    env: string | null;
    start_url: string | null;
    입력: boolean;
  }>(
    `SELECT service_id, requested_by, requested_by_name, env, start_url,
            EXISTS (SELECT 1 FROM authoring_asset WHERE request_id = $1 AND role = 'INPUT') AS "입력"
       FROM authoring_request
      WHERE id = $1 AND kind = 'AUTHOR' AND compare AND discarded_at IS NULL
        AND NOT (params ? 'prdApply') AND NOT (params ? 'edits')`,
    [뿌리번호],
  );
  const 행 = 뿌리.rows[0];
  if (행 === undefined || !행.입력) return null;
  const 상태 = await 이어작성상태읽기(뿌리번호, 손);
  if (!상태.병합됨 || 상태.남음 === '있음') return null;
  const 있음 = await 손.query(
    `SELECT 1 FROM authoring_request
      WHERE service_id = $1 AND discarded_at IS NULL AND params->>'uncoveredOf' = $2::text LIMIT 1`,
    [행.service_id, String(뿌리번호)],
  );
  if ((있음.rowCount ?? 0) > 0) return null;
  const r = await 손.query<{ id: string }>(
    `INSERT INTO authoring_request
       (service_id, kind, params, requested_by, requested_by_name, status, compare, env, start_url)
     VALUES ($1, 'AUTHOR', $2, $3, $4, 'PENDING', true, $5, $6)
     RETURNING id`,
    [행.service_id, JSON.stringify({ uncoveredOf: 뿌리번호 }), 행.requested_by, 행.requested_by_name, 행.env, 행.start_url],
  );
  return { id: Number(r.rows[0]!.id) };
}

/** 상세에 싣는 uncoveredOf — 뿌리 것 */
export async function 밖화면뿌리읽기(뿌리번호: number): Promise<number | null> {
  const r = await (await db()).query<{ v: unknown }>("SELECT params->'uncoveredOf' AS v FROM authoring_request WHERE id = $1", [뿌리번호]);
  return 밖화면뿌리(r.rows[0]?.v);
}

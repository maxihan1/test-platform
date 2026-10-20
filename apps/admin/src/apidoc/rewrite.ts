// 「바뀐 API 만 다시 작성」 작성 요청을 세운다 — 판 비교와 그 API 를 부르는 케이스를 요청에 박아 둔다 (도메인/API §3.8 「바뀐 API 만 다시 작성」)

import { API대상줄인가 } from '../authoring/apiDoc.js';
import { type 판변화, 판비교 } from './doc.js';
import { 판원문 } from './store.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 다시 쓸 API 하나 — 누를 때의 판 비교 한 줄과 그때 그 API 를 부르던 활성 케이스 */
export type API반영작업 = 판변화 & { tcIds: string[] };

/** `params.apiApply` — 에이전트가 이것만 보고 자식에게 넘긴다. 서버가 세울 때 채우고 사람 본문으로는 못 싣는다 */
export interface API반영 {
  fromVersion: number;
  toVersion: number;
  operations: API반영작업[];
}

type 고른것 = { method: string; path: string };

/** 본문 operations 를 읽는다. 배열이 아니거나 칸이 글자가 아니면 null */
export function 고른것읽기(v: unknown): 고른것[] | null {
  if (!Array.isArray(v)) return null;
  const 읽음 = v.map((x: unknown) => {
    if (typeof x !== 'object' || x === null) return null;
    const { method, path } = x as Record<string, unknown>;
    return typeof method === 'string' && typeof path === 'string' ? { method: method.toUpperCase(), path } : null;
  });
  return 읽음.some((x) => x === null) ? null : (읽음 as 고른것[]);
}

/**
 * 고른 API 가운데 판 비교에 든 것만 남긴다 — 안 바뀐 API 를 골라 보내도 다시 쓸 것이 없다.
 * 남은 게 없으면 NOTHING_TO_APPLY. 판이 없으면 NOT_FOUND(판 비교 통로와 같다)
 */
export async function 다시작성세우기(입력: {
  서비스: number;
  from: number;
  to: number;
  고른: 고른것[];
  env: unknown;
  누가: string;
  이름: string;
}): Promise<{ id: number } | { error: 'NOT_FOUND' | 'NOTHING_TO_APPLY' | 'BAD_ENV' }> {
  const [전, 후] = await Promise.all([판원문(입력.서비스, 입력.from), 판원문(입력.서비스, 입력.to)]);
  if (전 === null || 후 === null) return { error: 'NOT_FOUND' };
  const 고른키 = new Set(입력.고른.map((o) => `${o.method} ${o.path}`));
  const 바뀜 = 판비교(전.doc, 후.doc).filter((c) => 고른키.has(`${c.method} ${c.path}`));
  if (바뀜.length === 0) return { error: 'NOTHING_TO_APPLY' };
  if (!(await API대상줄인가(입력.서비스, 입력.env))) return { error: 'BAD_ENV' };

  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    // 지운 케이스는 안 맡긴다 — 커버리지와 같은 규칙(활성 케이스 줄만)
    const 본것 = await client.query<{ method: string; path: string; tc_ids: string[] }>(
      `SELECT a.method, a.path, array_agg(DISTINCT a.tc_id ORDER BY a.tc_id) AS tc_ids
         FROM api_call_seen a JOIN test_case tc ON tc.tc_id = a.tc_id AND tc.is_active
        WHERE a.service_id = $1 AND (a.method || ' ' || a.path) = ANY($2)
        GROUP BY a.method, a.path`,
      [입력.서비스, 바뀜.map((c) => `${c.method} ${c.path}`)],
    );
    const 케이스 = new Map(본것.rows.map((r) => [`${r.method} ${r.path}`, r.tc_ids]));
    const apiApply: API반영 = {
      fromVersion: 입력.from,
      toVersion: 입력.to,
      operations: 바뀜.map((c) => ({ ...c, tcIds: 케이스.get(`${c.method} ${c.path}`) ?? [] })),
    };
    // 자료는 새 판 하나 — 작성 요청 만들기의 API 판 자료와 같은 꼴이라 집기 응답에 target · apiDoc 이 그대로 실린다
    const r = await client.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, env)
       VALUES ($1, 'AUTHOR', $2, $3, $4, 'PENDING', $5) RETURNING id`,
      [입력.서비스, JSON.stringify({ apiApply }), 입력.누가, 입력.이름, 입력.env],
    );
    const id = Number(r.rows[0]!.id);
    await client.query(
      `INSERT INTO authoring_asset (request_id, position, kind, name, api_doc_version_id)
       SELECT $1, 1, 'API_DOC', $2, id FROM api_doc_version WHERE service_id = $3 AND version = $4`,
      [id, `API 문서 판 ${String(입력.to)}`, 입력.서비스, 입력.to],
    );
    await client.query('COMMIT');
    return { id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

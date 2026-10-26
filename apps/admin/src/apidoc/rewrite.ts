// 「바뀐 API 만 다시 작성」 작성 요청을 세운다 — 판 비교와 그 API 를 부르는 케이스를 요청에 박아 둔다 (도메인/API §3.8 「바뀐 API 만 다시 작성」)

import type { PoolClient } from 'pg';

import { API대상줄인가 } from '../authoring/apiDoc.js';
import { 열린작성 } from '../authoring/openRoots.js';
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

export type 다시작성오류 = { error: 'NOT_FOUND' | 'NOTHING_TO_APPLY' | 'BAD_ENV' | 'NOT_LATEST_VERSION' };
export type 다시작성준비 = { 서비스: number; from: number; to: number; 바뀜: 판변화[]; env: string };

/**
 * 고른 API 가운데 판 비교에 든 것만 남긴다 — 안 바뀐 API 를 골라 보내도 다시 쓸 것이 없다.
 * 남은 게 없거나 없어진 API 뿐이면 NOTHING_TO_APPLY — 없어진 API 의 케이스는 지우지 않으니 자식이 할 일이 없다(지우기는 케이스 고치기).
 * 판이 없으면 NOT_FOUND(판 비교 통로와 같다). 새 판이 마지막 판이 아니면 NOT_LATEST_VERSION — 옛 판으로 다시 쓰면 케이스가 뒤로 간다.
 * 풀 연결로 읽기만 한다 — 결정 진행이 잠금을 잡기 전에 부른다
 */
export async function 다시작성준비하기(입력: { 서비스: number; from: number; to: number; 고른: 고른것[] | null; env: unknown }): Promise<다시작성준비 | 다시작성오류> {
  const [전, 후] = await Promise.all([판원문(입력.서비스, 입력.from), 판원문(입력.서비스, 입력.to)]);
  if (전 === null || 후 === null) return { error: 'NOT_FOUND' };
  if ((await 판원문(입력.서비스))?.version !== 입력.to) return { error: 'NOT_LATEST_VERSION' };
  // 고른 것이 null 이면 없어진 것 빼고 전부다 — 결정 진행은 API 를 하나씩 고르지 않는다 (작성 §3.6 「★ 결정 목록」 ③ 「바뀐 API」)
  const 고른키 = 입력.고른 === null ? null : new Set(입력.고른.map((o) => `${o.method} ${o.path}`));
  const 바뀜 = 판비교(전.doc, 후.doc).filter((c) => (고른키 === null ? c.change !== 'REMOVED' : 고른키.has(`${c.method} ${c.path}`)));
  if (바뀜.every((c) => c.change === 'REMOVED')) return { error: 'NOTHING_TO_APPLY' };
  if (!(await API대상줄인가(입력.서비스, 입력.env))) return { error: 'BAD_ENV' };
  return { 서비스: 입력.서비스, from: 입력.from, to: 입력.to, 바뀜, env: 입력.env as string };
}

/**
 * 준비한 다시 작성 요청을 `손`(트랜잭션) 안에서 넣는다. 더할 칸(결정 진행의 decision)을 params 에 같이 싣는다.
 * 그 사이 판이 지워져 자료를 못 달면 null — 부르는 쪽이 되돌린다(자료 없는 요청을 세우면 에이전트가 한참 뒤에 실패한다)
 */
export async function 다시작성넣기(
  손: PoolClient,
  준비: 다시작성준비,
  사람: { 누가: string; 이름: string },
  더할: Record<string, unknown> = {},
): Promise<number | null> {
  // 지운 케이스는 안 맡긴다 — 커버리지와 같은 규칙(활성 케이스 줄만)
  const 본것 = await 손.query<{ method: string; path: string; tc_ids: string[] }>(
    `SELECT a.method, a.path, array_agg(DISTINCT a.tc_id ORDER BY a.tc_id) AS tc_ids
       FROM api_call_seen a JOIN test_case tc ON tc.tc_id = a.tc_id AND tc.is_active
      WHERE a.service_id = $1 AND (a.method || ' ' || a.path) = ANY($2)
      GROUP BY a.method, a.path`,
    [준비.서비스, 준비.바뀜.map((c) => `${c.method} ${c.path}`)],
  );
  const 케이스 = new Map(본것.rows.map((r) => [`${r.method} ${r.path}`, r.tc_ids]));
  const apiApply: API반영 = {
    fromVersion: 준비.from,
    toVersion: 준비.to,
    operations: 준비.바뀜.map((c) => ({ ...c, tcIds: 케이스.get(`${c.method} ${c.path}`) ?? [] })),
  };
  // 자료는 새 판 하나 — 작성 요청 만들기의 API 판 자료와 같은 꼴이라 집기 응답에 target · apiDoc 이 그대로 실린다
  const r = await 손.query<{ id: string }>(
    `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, env)
     VALUES ($1, 'AUTHOR', $2, $3, $4, 'PENDING', $5) RETURNING id`,
    [준비.서비스, JSON.stringify({ apiApply, ...더할 }), 사람.누가, 사람.이름, 준비.env],
  );
  const id = Number(r.rows[0]!.id);
  const 자료 = await 손.query(
    `INSERT INTO authoring_asset (request_id, position, kind, name, api_doc_version_id)
     SELECT $1, 1, 'API_DOC', $2, id FROM api_doc_version WHERE service_id = $3 AND version = $4`,
    [id, `API 문서 버전 ${String(준비.to)}`, 준비.서비스, 준비.to],
  );
  return 자료.rowCount === 1 ? id : null;
}

/**
 * 「바뀐 API 다시 작성」 통로 — 준비하고 잠금 안에서 넣는다.
 * 열린 작성(authoring/openRoots.ts — 끝났고 병합 전인 작성도)이 있으면 AUTHORING_OPEN 과 그 뿌리 번호 — 두 번 누르면 같은 케이스를 고치는 PR 이 둘 선다
 * (도메인/작성 §3.6 「★ 결정 목록」 「서버 막기」 · 앞 판은 대기 · 도는 중인 다시 작성만 APPLY_OPEN 으로 봤다)
 */
export async function 다시작성세우기(입력: {
  서비스: number;
  from: number;
  to: number;
  고른: 고른것[];
  env: unknown;
  누가: string;
  이름: string;
}): Promise<{ id: number } | 다시작성오류 | { error: 'AUTHORING_OPEN'; detail: number[] }> {
  const 준비 = await 다시작성준비하기(입력);
  if ('error' in 준비) return 준비;
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    // 확인과 넣기를 잠금 안에서 — 두 번 눌러도 하나만 선다(열린작성이 서비스 잠금을 잡는다)
    const 열린 = await 열린작성(입력.서비스, client);
    if (열린.length > 0) {
      await client.query('ROLLBACK');
      return { error: 'AUTHORING_OPEN', detail: 열린 };
    }
    const id = await 다시작성넣기(client, 준비, { 누가: 입력.누가, 이름: 입력.이름 });
    if (id === null) {
      await client.query('ROLLBACK');
      return { error: 'NOT_FOUND' };
    }
    await client.query('COMMIT');
    return { id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

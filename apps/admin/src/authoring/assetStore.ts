// 작성 자료 표(authoring_asset)를 읽고 쓰고, DRAFT 요청을 줄에 세운다 (SPEC 공통/4-데이터모델 §6 「작성 자료」)

import type { Pool, PoolClient } from 'pg';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. check:tests와 CI는 DB 없이 돌아야 하므로
// 풀은 실제로 쓸 때 가져온다 (store.ts 와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

async function 한묶음<T>(일: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    const 결과 = await 일(client);
    await client.query('COMMIT');
    return 결과;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** 한 요청의 자료 개수 상한. 값의 정본은 도메인/작성 §7 「자료」 표다 */
export const 자료상한 = 20;

export interface 자료 {
  id: number;
  position: number;
  kind: 'FILE' | 'FIGMA';
  name: string;
  figmaUrl: string | null;
  size: number | null;
}

interface 자료행 {
  id: string;
  position: number;
  kind: 'FILE' | 'FIGMA';
  name: string;
  figma_url: string | null;
  size: string | null;
}

function 빚기(r: 자료행): 자료 {
  return {
    id: Number(r.id),
    position: r.position,
    kind: r.kind,
    name: r.name,
    figmaUrl: r.figma_url,
    size: r.size === null ? null : Number(r.size),
  };
}

/**
 * 작성 요청을 DRAFT 로 세우고 피그마 주소마다 자료 한 행을 붙인다.
 *
 * **한 묶음으로 쓴다** — 행만 서고 주소가 빠지면 사람은 넣었다고 여기는데 맥은 못 본다.
 * 주소는 라우트가 이미 정규화했다. 여기서는 믿는다.
 */
export async function 준비세우기(입력: {
  서비스: number;
  누가: string;
  이름: string;
  피그마: string[];
  값?: Record<string, unknown>;
}): Promise<number> {
  return 한묶음(async (client) => {
    const r = await client.query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, params, requested_by, requested_by_name, status)
       VALUES ($1, 'AUTHOR', $2, $3, $4, 'DRAFT')
       RETURNING id`,
      [입력.서비스, JSON.stringify(입력.값 ?? {}), 입력.누가, 입력.이름],
    );
    const id = Number(r.rows[0]!.id);
    for (const [i, 주소] of 입력.피그마.entries()) {
      await client.query(
        `INSERT INTO authoring_asset (request_id, position, kind, name, figma_url)
         VALUES ($1, $2, 'FIGMA', $3, $3)`,
        [id, i + 1, 주소],
      );
    }
    return id;
  });
}

/**
 * 파일 자료 한 행을 붙인다. 디스크에 쓰는 것은 라우트다 — 쓰기에 실패하면 `자료지우기` 로 되돌린다.
 *
 * **요청 행을 먼저 잠근다.** 개수 셈과 다음 번호를 한 문장에서 구해도 두 올리기가 같은 순간에 오면
 * 둘이 같은 최댓값을 읽는다 — 그러면 하나는 `UNIQUE` 에 걸려 500 이 나고 상한도 21 개째를 통과시킨다.
 * 잠근 뒤 새 문장을 시작해야 앞엣것이 넣은 행이 보인다. 잠금은 `status='DRAFT'` 를 걸고 잡아서
 * 줄에 세우기(`제출`)와도 순서가 선다.
 */
export async function 자료더하기(
  요청: number,
  파일: { name: string; size: number },
): Promise<{ id: number; position: number } | 'NOT_DRAFT' | 'TOO_MANY'> {
  return 한묶음(async (client) => {
    const 잠금 = await client.query(
      `SELECT 1 FROM authoring_request WHERE id = $1 AND status = 'DRAFT' FOR UPDATE`,
      [요청],
    );
    if (잠금.rowCount !== 1) return 'NOT_DRAFT';
    const r = await client.query<{ id: string; position: number }>(
      `INSERT INTO authoring_asset (request_id, position, kind, name, size)
       SELECT $1, COALESCE(MAX(position), 0) + 1, 'FILE', $2, $3
         FROM authoring_asset
        WHERE request_id = $1
       HAVING count(*) < $4
       RETURNING id, position`,
      [요청, 파일.name, 파일.size, 자료상한],
    );
    const 행 = r.rows[0];
    return 행 === undefined ? 'TOO_MANY' : { id: Number(행.id), position: 행.position };
  });
}

/** 파일 쓰기에 실패한 자료 행을 지운다. 행만 남으면 내려받기가 없는 파일을 찾는다 */
export async function 자료지우기(자료번호: number): Promise<void> {
  await (await db()).query('DELETE FROM authoring_asset WHERE id = $1', [자료번호]);
}

export async function 자료목록(요청: number): Promise<자료[]> {
  const r = await (await db()).query<자료행>(
    `SELECT id, position, kind, name, figma_url, size
       FROM authoring_asset WHERE request_id = $1 ORDER BY position`,
    [요청],
  );
  return r.rows.map(빚기);
}

/**
 * 줄에 세운다. `DRAFT → PENDING`.
 *
 * **한 문장 UPDATE 가 판정이다** — 자료가 0 이거나 이미 선 행이면 아무것도 안 바뀌고 false 다.
 * 읽고 나서 고치면 그 사이에 맥이 집거나 자료가 빠질 수 있다.
 */
export async function 제출(요청: number): Promise<boolean> {
  const r = await (await db()).query(
    `UPDATE authoring_request SET status = 'PENDING'
      WHERE id = $1 AND status = 'DRAFT'
        AND EXISTS (SELECT 1 FROM authoring_asset WHERE request_id = $1)`,
    [요청],
  );
  return r.rowCount === 1;
}

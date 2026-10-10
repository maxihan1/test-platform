// 표준 기획서 판 표를 읽고 쓴다. 저장마다 새 판이고 옛 판은 고치지 않는다 — 되돌리기도 새 판 (도메인/작성 §3.6 「★ 표준 기획서」)

import type { PrdItem } from '@platform/kit';
import type { Pool, PoolClient } from 'pg';

import { 사슬식, 최신식 } from '../authoring/history.js';
import { 반영안됨, 사람판, 옮기기판, 판같나, 확정판, type 들어온항목, type 앞판, type 판짓기오류 } from './rules.js';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. CI 는 DB 없이 돌아야 하므로 쓸 때 가져온다
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface 저장하는사람 {
  username: string;
  displayName: string;
}

type 출처 = 'AGENT' | 'PERSON' | 'REVERT';
export type 저장결과 = { version: number } | { error: 'PRD_STALE'; latest: number } | 판짓기오류;

interface 판행 {
  version: number;
  items: PrdItem[];
  last_no: number;
}

const 빚기 = (행: 판행): 앞판 => ({ version: 행.version, items: 행.items, lastNo: 행.last_no });

async function 지금판읽기(손: Pool | PoolClient, 서비스: number): Promise<앞판 | null> {
  const r = await 손.query<판행>(
    'SELECT version, items, last_no FROM prd_version WHERE service_id = $1 ORDER BY version DESC LIMIT 1',
    [서비스],
  );
  return r.rows[0] === undefined ? null : 빚기(r.rows[0]);
}

async function 판읽기(손: Pool | PoolClient, 서비스: number, version: number): Promise<앞판 | null> {
  const r = await 손.query<판행>('SELECT version, items, last_no FROM prd_version WHERE service_id = $1 AND version = $2', [
    서비스,
    version,
  ]);
  return r.rows[0] === undefined ? null : 빚기(r.rows[0]);
}

export async function 지금판(서비스: number): Promise<앞판 | null> {
  return 지금판읽기(await db(), 서비스);
}

/** 그 서비스 대상 서버 줄의 테스트 계정 비밀번호들 — 워드에서 가린다. 짧은 비밀번호를 거르는 문턱은 docx.ts 가 본다 */
export async function 테스트비밀번호들(서비스: number): Promise<string[]> {
  const r = await (await db()).query<{ login_password: string }>(
    `SELECT login_password FROM service_env WHERE service_id = $1 AND COALESCE(login_password, '') <> ''`,
    [서비스],
  );
  return r.rows.map((x) => x.login_password);
}

/** 에이전트 통로는 요청 번호로 서비스를 찾는다 — 번호 꼴(`<접두사>-REQ-`)에 쓸 접두사 */
export async function 서비스접두사(서비스: number): Promise<string> {
  const r = await (await db()).query<{ prefix: string }>('SELECT prefix FROM service WHERE id = $1', [서비스]);
  return r.rows[0]!.prefix;
}

export interface 판줄 {
  version: number;
  source: 출처;
  savedByName: string;
  savedAt: string;
}

export async function 판목록(서비스: number): Promise<판줄[]> {
  const r = await (await db()).query<{ version: number; source: 출처; saved_by_name: string; saved_at: Date }>(
    'SELECT version, source, saved_by_name, saved_at FROM prd_version WHERE service_id = $1 ORDER BY version DESC',
    [서비스],
  );
  return r.rows.map((x) => ({ version: x.version, source: x.source, savedByName: x.saved_by_name, savedAt: x.saved_at.toISOString() }));
}

export async function 판하나(서비스: number, version: number): Promise<{ version: number; items: PrdItem[] } | null> {
  const 판 = await 판읽기(await db(), 서비스, version);
  return 판 === null ? null : { version: 판.version, items: 판.items };
}

/**
 * 서비스마다 저장을 한 줄로 세운다. 판 번호를 읽고 넣는 사이에 다른 저장이 끼면 둘이 같은 번호를 노린다 —
 * PK (service_id, version) 가 마지막 그물이다. 트랜잭션 잠금이라 끝나면 저절로 풀린다
 */
async function 잠그고<T>(서비스: number, 일: (손: PoolClient) => Promise<T>): Promise<T> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    await 손.query(`SELECT pg_advisory_xact_lock(hashtext('prd'), ($1::bigint % 2147483647)::int)`, [서비스]);
    const 결과 = await 일(손);
    await 손.query('COMMIT');
    return 결과;
  } catch (err) {
    await 손.query('ROLLBACK');
    throw err;
  } finally {
    손.release();
  }
}

/**
 * 새 판을 넣고 번호를 돌려준다. 앞 판과 통째로 같으면 안 넣고 앞 판 번호다 — 옮기기를 다시 돌릴 때마다 같은 판이 쌓이지 않게.
 * 표준 기획서가 없는데 빈 목록이면 0 이다(빈 판 1 을 만들지 않는다)
 */
async function 판넣기(
  손: PoolClient,
  서비스: number,
  앞: 앞판 | null,
  새: { items: PrdItem[]; lastNo: number },
  출처: 출처,
  사람: 저장하는사람,
  요청: number | null = null,
): Promise<number> {
  if (앞 === null ? 새.items.length === 0 : 새.lastNo === 앞.lastNo && 판같나(새.items, 앞.items)) return 앞?.version ?? 0;
  const version = (앞?.version ?? 0) + 1;
  await 손.query(
    `INSERT INTO prd_version (service_id, version, items, last_no, source, request_id, saved_by, saved_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [서비스, version, JSON.stringify(새.items), 새.lastNo, 출처, 요청, 사람.username, 사람.displayName],
  );
  return version;
}

const 낡음 = (앞: 앞판 | null) => ({ error: 'PRD_STALE' as const, latest: 앞?.version ?? 0 });

/** 사람이 저장한다. 받은 판이 지금 판이 아니면 PRD_STALE — 두 사람이 같은 판을 고쳐 한쪽이 조용히 사라지지 않게 */
export async function 사람저장(
  서비스: number,
  접두사: string,
  baseVersion: number,
  items: 들어온항목[],
  사람: 저장하는사람,
): Promise<저장결과> {
  return 잠그고(서비스, async (손) => {
    const 앞 = await 지금판읽기(손, 서비스);
    if (baseVersion !== (앞?.version ?? 0)) return 낡음(앞);
    const 새 = 사람판(앞, items, 접두사, new Date().toISOString());
    if ('error' in 새) return 새;
    return { version: await 판넣기(손, 서비스, 앞, 새, 'PERSON', 사람) };
  });
}

export async function 일괄확정(서비스: number, baseVersion: number, reqIds: unknown, 사람: 저장하는사람): Promise<저장결과> {
  return 잠그고(서비스, async (손) => {
    const 앞 = await 지금판읽기(손, 서비스);
    if (baseVersion !== (앞?.version ?? 0)) return 낡음(앞);
    const 새 = 확정판(앞, reqIds);
    if ('error' in 새) return 새;
    return { version: await 판넣기(손, 서비스, 앞, 새, 'PERSON', 사람) };
  });
}

/** 옛 판 항목을 복사한 새 판. 사람이 저장한 것과 같은 규칙으로 표시를 단다 — 되돌린 항목은 다음 옮기기가 덮지 않는다. 그 판이 없으면 null */
export async function 되돌리기(
  서비스: number,
  접두사: string,
  baseVersion: number,
  toVersion: number,
  사람: 저장하는사람,
): Promise<저장결과 | null> {
  return 잠그고(서비스, async (손) => {
    const 앞 = await 지금판읽기(손, 서비스);
    if (baseVersion !== (앞?.version ?? 0)) return 낡음(앞);
    const 옛판 = await 판읽기(손, 서비스, toVersion);
    if (옛판 === null) return null;
    const 새 = 사람판(앞, 옛판.items, 접두사, new Date().toISOString(), new Set(옛판.items.map((x) => x.reqId)));
    if ('error' in 새) return 새;
    return { version: await 판넣기(손, 서비스, 앞, 새, 'REVERT', 사람) };
  });
}

/**
 * 옮기기(작성 에이전트)가 올린 판. 거절하지 않고 지금 판에 합친다(rules.ts `옮기기판`).
 * 요청의 읽은 판(prd_version)을 같은 트랜잭션에서 그 판으로 바꾼다 — 끝난 요청이면 NOT_RUNNING
 */
export async function 옮기기(
  요청: number,
  서비스: number,
  접두사: string,
  baseVersion: number,
  items: 들어온항목[],
  사람: 저장하는사람,
): Promise<{ version: number; keptByPerson: string[] } | 판짓기오류 | { error: 'NOT_RUNNING'; detail: string }> {
  return 잠그고(서비스, async (손) => {
    // 라우트가 이미 봤다. 여기는 그 사이 끝난 요청을 막는 그물이다
    const 상태 = await 손.query<{ status: string }>('SELECT status FROM authoring_request WHERE id = $1 FOR UPDATE', [요청]);
    const 지금상태 = 상태.rows[0]?.status ?? '';
    if (지금상태 !== 'RUNNING') return { error: 'NOT_RUNNING' as const, detail: 지금상태 };
    const 지금 = await 지금판읽기(손, 서비스);
    const 받은판 = baseVersion === 0 ? null : await 판읽기(손, 서비스, baseVersion);
    if (baseVersion !== 0 && 받은판 === null) return { error: 'BAD_PRD' as const, detail: 'baseVersion' };
    const 새 = 옮기기판(받은판, 지금, items, 접두사, new Date().toISOString());
    if ('error' in 새) return 새;
    const version = await 판넣기(손, 서비스, 지금, 새, 'AGENT', 사람, 요청);
    await 손.query('UPDATE authoring_request SET prd_version = NULLIF($2, 0) WHERE id = $1', [요청, version]);
    return { version, keptByPerson: 새.keptByPerson };
  });
}

export interface 덮는케이스 {
  tcId: string;
  axis: string;
  techniques: string[];
}

/** 지도 ① — 번호마다 덮는 활성 케이스. 표준 기획서에 없는 번호도 싣는다(화면이 「PRD 에 없음」으로 보인다) */
export async function 케이스지도(서비스: number): Promise<Record<string, 덮는케이스[]>> {
  const r = await (await db()).query<{ req_id: string; tc_id: string; axis: string; techniques: string[] }>(
    `SELECT r.req_id, r.tc_id, r.axis, t.techniques
       FROM req_case r JOIN test_case t ON t.tc_id = r.tc_id AND t.is_active
      WHERE r.service_id = $1
      ORDER BY r.req_id, r.tc_id, r.axis`,
    [서비스],
  );
  const 지도: Record<string, 덮는케이스[]> = {};
  for (const x of r.rows) (지도[x.req_id] ??= []).push({ tcId: x.tc_id, axis: x.axis, techniques: x.techniques });
  return 지도;
}

/**
 * 「반영 안 됨」의 기준 판 — 병합으로 끝난 반영(MERGE) 가운데 가장 최근 것이 병합한 작성 실행이 읽은 판.
 * 케이스 고치기(EDIT · 그 다시 적용)는 표준 기획서를 안 읽어 기준이 못 된다. 기준이 없거나 그 실행이 판을 안 읽었으면 null — 전부 반영 안 됨이다
 */
export async function 기준판(서비스: number): Promise<{ version: number; items: PrdItem[] } | null> {
  const r = await (await db()).query<{ version: number | null; items: PrdItem[] | null }>(
    `SELECT v.version, v.items
       FROM authoring_request m
       JOIN authoring_request src ON src.id = m.source_id
       LEFT JOIN prd_version v ON v.service_id = src.service_id AND v.version = src.prd_version
      WHERE m.service_id = $1 AND m.kind = 'MERGE' AND m.status = 'DONE'
        AND src.kind IN ('AUTHOR', 'RERUN') AND NOT (src.params ? 'edits')
      ORDER BY m.finished_at DESC NULLS LAST, m.id DESC
      LIMIT 1`,
    [서비스],
  );
  const 행 = r.rows[0];
  return 행?.version == null || 행.items === null ? null : { version: 행.version, items: 행.items };
}

/**
 * 「바뀐 요구 N건 테스트에 반영」 — 자료 없는 작성 요청 하나를 곧장 줄에 세운다. 반영 안 됨이 0 이면 세우지 않는다.
 * 열린 반영(폐기 안 됨 · 최신 실행이 병합된 반영이 아님)이 있으면 APPLY_OPEN — 두 번 누르면 같은 판을 고치는 PR 이 둘 선다.
 * 확인과 넣기를 서비스 잠금 안에서 한다(열린 케이스 고치기 EDIT_OPEN 과 같은 꼴)
 */
export async function 반영세우기(
  서비스: number,
  사람: 저장하는사람,
): Promise<{ id: number } | { error: 'NOTHING_TO_APPLY' } | { error: 'APPLY_OPEN'; detail: number[] }> {
  const [지금, 기준] = await Promise.all([지금판(서비스), 기준판(서비스)]);
  const 차이 = 반영안됨(기준?.items ?? null, 지금?.items ?? []);
  if (차이.changed.length + 차이.added.length + 차이.removed.length === 0) return { error: 'NOTHING_TO_APPLY' };
  return 잠그고(서비스, async (손) => {
    const 열린 = await 손.query<{ id: string }>(
      `WITH RECURSIVE ${사슬식("service_id = $1 AND kind = 'AUTHOR' AND params->>'prdApply' = 'true' AND discarded_at IS NULL")}
       SELECT r.id FROM authoring_request r
        WHERE r.id IN (SELECT root_id FROM 사슬)
          AND NOT EXISTS (SELECT 1 FROM authoring_request m
                           WHERE m.id = ${최신식('(SELECT id FROM 사슬 WHERE root_id = r.id)')}
                             AND m.kind = 'MERGE' AND m.status = 'DONE')
        ORDER BY r.id`,
      [서비스],
    );
    if (열린.rows.length > 0) return { error: 'APPLY_OPEN' as const, detail: 열린.rows.map((x) => Number(x.id)) };
    const r = await 손.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
       VALUES ($1, 'AUTHOR', '{"prdApply": true}', $2, $3, 'PENDING') RETURNING id`,
      [서비스, 사람.username, 사람.displayName],
    );
    return { id: Number(r.rows[0]!.id) };
  });
}

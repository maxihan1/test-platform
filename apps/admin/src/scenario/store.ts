// 시나리오와 버전 표를 읽고 쓴다. 저장마다 버전이 하나 오르고 옛 버전은 고치지 않는다 (SPEC 도메인/시나리오 §3.7 결정 7)

import type { ItemStatus, Platform, ScenarioPart } from '@platform/kit';
import type { Pool, PoolClient } from 'pg';

import { 미확정SQL, 접은판정SQL } from './verdict.js';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. CI 는 DB 없이 돌아야 하므로 쓸 때 가져온다
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface 저장하는사람 {
  username: string;
  displayName: string;
}

export interface 목록줄 {
  id: number;
  name: string;
  platform: Platform;
  version: number;
  partCount: number;
  isActive: boolean;
  lastRun: { runId: number; status: string; verdict: ItemStatus | null; finishedAt: string | null; unconfirmed: boolean } | null;
  // 점검 재료. 라우트가 needsCheck·runnable 을 계산하고 응답에서 뺀다
  parts: ScenarioPart[];
}

export interface 상세본 {
  id: number;
  service: string;
  name: string;
  platform: Platform;
  version: number;
  parts: ScenarioPart[];
  isActive: boolean;
  versions: { version: number; savedBy: string; savedByName: string; savedAt: string }[];
}

export type 치운것 = { error: 'SCENARIO_ARCHIVED' };
export type 고치기결과 = { version: number } | { error: 'STALE_VERSION'; latest: number } | 치운것 | null;
const 치웠다: 치운것 = { error: 'SCENARIO_ARCHIVED' };

// 최신 버전 한 줄. 목록과 상세가 같은 뜻의 「최신」을 본다
const 최신버전 = `
  JOIN LATERAL (SELECT version, platform, parts FROM scenario_version
                 WHERE scenario_id = sc.id ORDER BY version DESC LIMIT 1) v ON true`;

interface 버전행 {
  version: number;
  platform: Platform;
  parts: ScenarioPart[];
}

export async function 만들기(
  serviceId: number,
  name: string,
  platform: Platform,
  parts: ScenarioPart[],
  사람: 저장하는사람,
): Promise<{ id: number; version: 1 }> {
  return 쓰기(async (c) => {
    const r = await c.query<{ id: string }>(
      'INSERT INTO scenario (service_id, name, created_by) VALUES ($1, $2, $3) RETURNING id',
      [serviceId, name, 사람.username],
    );
    const id = Number(r.rows[0]!.id);
    await 버전넣기(c, id, 1, platform, parts, 사람);
    return { id, version: 1 as const };
  });
}

export async function 목록(serviceId: number): Promise<목록줄[]> {
  const r = await (await db()).query<
    버전행 & {
      id: string;
      name: string;
      is_active: boolean;
      run_id: string | null;
      run_status: string | null;
      verdict: ItemStatus | null;
      unconfirmed: boolean;
      finished_at: Date | null;
    }
  >(
    // ponytail: test_run.scenario_id 색인 없음 — 시나리오 실행이 수만 건이 되면 색인 마이그레이션
    `SELECT sc.id, sc.name, sc.is_active, v.version, v.platform, v.parts,
            r.run_id, r.status AS run_status, r.finished_at,
            CASE WHEN r.status = 'RUNNING' THEN NULL
                 ELSE (SELECT ${접은판정SQL('p')} FROM scenario_run_part p WHERE p.run_id = r.run_id) END AS verdict,
            (SELECT ${미확정SQL('p')} FROM scenario_run_part p WHERE p.run_id = r.run_id) AS unconfirmed
       FROM scenario sc ${최신버전}
       LEFT JOIN LATERAL (SELECT run_id, status, finished_at FROM test_run
                           WHERE kind = 'SCENARIO' AND scenario_id = sc.id ORDER BY run_id DESC LIMIT 1) r ON true
      WHERE sc.service_id = $1 AND sc.is_active
      ORDER BY sc.id`,
    [serviceId],
  );
  return r.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    platform: row.platform,
    version: row.version,
    partCount: row.parts.length,
    isActive: row.is_active,
    lastRun:
      row.run_id === null
        ? null
        : {
            runId: Number(row.run_id),
            status: row.run_status!,
            verdict: row.verdict,
            finishedAt: row.finished_at?.toISOString() ?? null,
            unconfirmed: row.unconfirmed,
          },
    parts: row.parts,
  }));
}

export async function 상세(id: number): Promise<상세본 | null> {
  const pool = await db();
  const r = await pool.query<버전행 & { name: string; is_active: boolean; prefix: string }>(
    `SELECT sc.name, sc.is_active, s.prefix, v.version, v.platform, v.parts
       FROM scenario sc JOIN service s ON s.id = sc.service_id ${최신버전}
      WHERE sc.id = $1`,
    [id],
  );
  const row = r.rows[0];
  if (row === undefined) return null;
  const 이력 = await pool.query<{ version: number; saved_by: string; saved_by_name: string; saved_at: Date }>(
    'SELECT version, saved_by, saved_by_name, saved_at FROM scenario_version WHERE scenario_id = $1 ORDER BY version DESC',
    [id],
  );
  return {
    id,
    service: row.prefix,
    name: row.name,
    platform: row.platform,
    version: row.version,
    parts: row.parts,
    isActive: row.is_active,
    versions: 이력.rows.map((v) => ({
      version: v.version,
      savedBy: v.saved_by,
      savedByName: v.saved_by_name,
      savedAt: v.saved_at.toISOString(),
    })),
  };
}

export async function 옛버전(id: number, version: number): Promise<{ platform: Platform; parts: ScenarioPart[] } | null> {
  const r = await (await db()).query<버전행>(
    'SELECT platform, parts FROM scenario_version WHERE scenario_id = $1 AND version = $2',
    [id, version],
  );
  const row = r.rows[0];
  return row === undefined ? null : { platform: row.platform, parts: row.parts };
}

export async function 고치기(
  id: number,
  고칠것: { name: string; platform: Platform; parts: ScenarioPart[]; baseVersion: number },
  사람: 저장하는사람,
): Promise<고치기결과> {
  try {
    return await 쓰기(async (c) => {
      const 최신 = await 잠그고최신(c, id);
      if (최신 === null) return null;
      if (최신 === '치움') return 치웠다;
      // 말없이 덮으면 앞사람의 조립이 이력에서 사라진다
      if (고칠것.baseVersion !== 최신) return { error: 'STALE_VERSION' as const, latest: 최신 };
      await c.query('UPDATE scenario SET name = $2 WHERE id = $1', [id, 고칠것.name]);
      await 버전넣기(c, id, 최신 + 1, 고칠것.platform, 고칠것.parts, 사람);
      return { version: 최신 + 1 };
    });
  } catch (err) {
    // 행 잠금이 줄을 세우므로 여기 닿으면 안 된다. 닿아도 500 이 아니라 「누가 먼저 고쳤다」다
    if ((err as { code?: string }).code !== '23505') throw err;
    const 지금 = await 상세(id);
    return { error: 'STALE_VERSION', latest: 지금?.version ?? 고칠것.baseVersion };
  }
}

/** 옛 버전을 복사한 새 버전. 시나리오나 그 버전이 없으면 null */
export async function 되돌리기(
  id: number,
  version: number,
  사람: 저장하는사람,
): Promise<{ version: number } | 치운것 | null> {
  return 쓰기(async (c) => {
    const 최신 = await 잠그고최신(c, id);
    if (최신 === null) return null;
    if (최신 === '치움') return 치웠다;
    const 옛것 = await c.query<버전행>(
      'SELECT platform, parts FROM scenario_version WHERE scenario_id = $1 AND version = $2',
      [id, version],
    );
    const row = 옛것.rows[0];
    if (row === undefined) return null;
    await 버전넣기(c, id, 최신 + 1, row.platform, row.parts, 사람);
    return { version: 최신 + 1 };
  });
}

/** 목록에서 치운다. 지우지 않는다 — 지난 실행이 가리킨다 */
export async function 치우기(id: number): Promise<boolean> {
  const r = await (await db()).query('UPDATE scenario SET is_active = false WHERE id = $1', [id]);
  return (r.rowCount ?? 0) > 0;
}

async function 쓰기<T>(일: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await (await db()).connect();
  try {
    await c.query('BEGIN');
    const 결과 = await 일(c);
    await c.query('COMMIT');
    return 결과;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

// 시나리오 행을 잠가 같은 시나리오의 저장을 한 줄로 세운다. PK (scenario_id, version) 가 마지막 그물이다.
// 치웠는지도 잠근 행에서 본다 — 잠그기 전에 보면 그 사이 치우기가 끼어 치운 것에 새 버전이 들어간다
async function 잠그고최신(c: PoolClient, id: number): Promise<number | '치움' | null> {
  const 잠금 = await c.query<{ is_active: boolean }>('SELECT is_active FROM scenario WHERE id = $1 FOR UPDATE', [id]);
  const 행 = 잠금.rows[0];
  if (행 === undefined) return null;
  if (!행.is_active) return '치움';
  const r = await c.query<{ max: number }>('SELECT max(version) AS max FROM scenario_version WHERE scenario_id = $1', [id]);
  return r.rows[0]?.max ?? 0;
}

async function 버전넣기(
  c: PoolClient,
  id: number,
  version: number,
  platform: Platform,
  parts: ScenarioPart[],
  사람: 저장하는사람,
): Promise<void> {
  await c.query(
    `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, version, platform, JSON.stringify(parts), 사람.username, 사람.displayName],
  );
}

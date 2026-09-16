// 스캔 결과를 test_case에 밀어 넣는다. 이 테이블은 캐시이고 진실의 원천은 코드이므로 스캔 때마다 덮어쓴다 (SPEC §3.1)

import type { Pool } from 'pg';

import type { CaseSpec } from '@platform/kit';

export interface SaveResult {
  added: number;
  updated: number;
  deactivated: number;
}

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. check:tests와 CI는 DB 없이 돌아야 하므로
// 풀은 실제로 쓸 때 가져온다 (smoke.ts와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const UPSERT = `
  INSERT INTO test_case
    (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active, scanned_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, true, now())
  ON CONFLICT (tc_id) DO UPDATE SET
    name            = EXCLUDED.name,
    platforms       = EXCLUDED.platforms,
    precondition    = EXCLUDED.precondition,
    file_path       = EXCLUDED.file_path,
    param_schema    = EXCLUDED.param_schema,
    expected_schema = EXCLUDED.expected_schema,
    is_active       = true,
    scanned_at      = now()
  RETURNING (xmax = 0) AS inserted`;

export interface CaseRow extends CaseSpec {
  isActive: boolean;
  scannedAt: string;
}

interface RawRow {
  tc_id: string;
  name: string;
  platforms: CaseSpec['platforms'];
  precondition: string[];
  file_path: string;
  param_schema: CaseSpec['paramSchema'];
  expected_schema: CaseSpec['expectedSchema'];
  is_active: boolean;
  scanned_at: Date;
  total?: string;
}

function toCase(row: RawRow): CaseRow {
  return {
    tcId: row.tc_id,
    name: row.name,
    platforms: row.platforms,
    precondition: row.precondition,
    filePath: row.file_path,
    paramSchema: row.param_schema,
    expectedSchema: row.expected_schema,
    isActive: row.is_active,
    scannedAt: row.scanned_at.toISOString(),
  };
}

const COLUMNS = 'tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active, scanned_at';

// ILIKE에서 % 와 _ 는 아무 글자나 맞는 기호다. 사람이 친 검색어는 글자 그대로여야 한다
function literal(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function listCases(
  q: string,
  page: number,
  pageSize: number,
): Promise<{ items: CaseRow[]; total: number; page: number; pageSize: number }> {
  const pool = await db();
  const rows = await pool.query<RawRow>(
    `SELECT ${COLUMNS}, count(*) OVER () AS total
       FROM test_case
      WHERE is_active
        AND ($1 = '' OR tc_id ILIKE $2 ESCAPE '\\' OR name ILIKE $2 ESCAPE '\\')
      ORDER BY tc_id
      LIMIT $3 OFFSET $4`,
    [q, literal(q), pageSize, (page - 1) * pageSize],
  );

  return {
    items: rows.rows.map(toCase),
    total: Number(rows.rows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function findCase(tcId: string): Promise<CaseRow | null> {
  const pool = await db();
  // 비활성 케이스도 돌려준다. 과거 실행 이력이 상세 화면을 열 때 이 경로를 쓴다
  const rows = await pool.query<RawRow>(`SELECT ${COLUMNS} FROM test_case WHERE tc_id = $1`, [tcId]);
  const row = rows.rows[0];
  return row === undefined ? null : toCase(row);
}

export async function save(specs: CaseSpec[], deactivateMissing: boolean): Promise<SaveResult> {
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');

    let added = 0;
    for (const spec of specs) {
      // xmax가 0이면 새로 넣은 행이다. 갱신된 행은 0이 아니다 — 추가와 갱신을 한 번의 질의로 가른다
      const upserted = await client.query<{ inserted: boolean }>(UPSERT, [
        spec.tcId,
        spec.name,
        JSON.stringify(spec.platforms),
        JSON.stringify(spec.precondition),
        spec.filePath,
        JSON.stringify(spec.paramSchema),
        JSON.stringify(spec.expectedSchema),
      ]);
      if (upserted.rows[0]?.inserted === true) added += 1;
    }

    // 코드에서 사라진 케이스는 지우지 않는다. 과거 실행 이력이 참조하므로 비활성으로만 둔다 (SPEC §3.1).
    // 스캔 결과가 통째로 비면 마운트가 빠진 쪽이 훨씬 그럴듯하므로 카탈로그를 전부 내리지 않는다
    let deactivated = 0;
    if (deactivateMissing && specs.length > 0) {
      const dropped = await client.query(
        'UPDATE test_case SET is_active = false WHERE is_active = true AND tc_id <> ALL($1::text[])',
        [specs.map((s) => s.tcId)],
      );
      deactivated = dropped.rowCount ?? 0;
    }

    await client.query('COMMIT');
    return { added, updated: specs.length - added, deactivated };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

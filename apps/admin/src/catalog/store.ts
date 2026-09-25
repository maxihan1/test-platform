// 스캔 결과를 test_case에 밀어 넣는다. 이 테이블은 캐시이고 진실의 원천은 코드이므로 스캔 때마다 덮어쓴다 (SPEC §3.1)

import type { Pool } from 'pg';

import type { CaseSpec, Platform } from '@platform/kit';

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
    (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active, scanned_at,
     unconfirmed, unconfirmed_since)
  VALUES ($1, $2, $3, $4, $5, $6, $7, true, now(),
          $8::text, CASE WHEN $8::text IS NULL THEN NULL ELSE now() END)
  ON CONFLICT (tc_id) DO UPDATE SET
    unconfirmed     = EXCLUDED.unconfirmed,
    -- 나이는 처음 단 때부터 잰다. 사유 글자를 고쳐도 유지하고, 풀리면 비워서 다시 달 때 새로 잰다 (카탈로그 §3.1)
    unconfirmed_since = CASE WHEN EXCLUDED.unconfirmed IS NULL THEN NULL
                             ELSE COALESCE(test_case.unconfirmed_since, now()) END,
    name            = EXCLUDED.name,
    platforms       = EXCLUDED.platforms,
    precondition    = EXCLUDED.precondition,
    file_path       = EXCLUDED.file_path,
    param_schema    = EXCLUDED.param_schema,
    expected_schema = EXCLUDED.expected_schema,
    is_active       = true,
    scanned_at      = now()
  RETURNING (xmax = 0) AS inserted`;

// 명세의 unconfirmed 는 없으면 키가 없다. 응답은 화면이 칸을 늘 읽도록 null 로 채운다 (카탈로그 §7)
export type CaseRow = Omit<CaseSpec, 'unconfirmed'> & {
  isActive: boolean;
  scannedAt: string;
  unconfirmed: string | null;
  unconfirmedSince: string | null;
};

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
  unconfirmed: string | null;
  unconfirmed_since: Date | null;
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
    unconfirmed: row.unconfirmed,
    unconfirmedSince: row.unconfirmed_since?.toISOString() ?? null,
  };
}

const COLUMNS = 'tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active, scanned_at, '
  + 'unconfirmed, unconfirmed_since';

// ILIKE에서 % 와 _ 는 아무 글자나 맞는 기호다. 사람이 친 검색어는 글자 그대로여야 한다
function literal(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export interface CaseQuery {
  // 보고 있는 서비스의 접두사. test_case에는 서비스 칸이 없다 — 번호가 이미 서비스를 말한다 (SPEC §1 · §6)
  service: string;
  q: string;
  platform?: Platform;
  // 화면 칩은 「활성만」과 「전체」 둘이다 (§8.1). 기본은 활성만
  activeOnly: boolean;
  page: number;
  pageSize: number;
}

export interface CaseList {
  items: CaseRow[];
  total: number;
  // 지금은 세어서 내므로 정확하다. 근사치로 바뀌는 날 화면이 이 값을 보고 판단한다 (§8.1)
  totalIsExact: boolean;
  // 화면이 순서를 정하지 않는다. 응답이 준 순서 그대로 그린다 (§8.1)
  sort: string;
  page: number;
  pageSize: number;
  // 검색 조건을 따르지 않는다. 걸러 낸 뒤에도 서비스에 미확정이 몇 건 남았는지 알려야 한다 (카탈로그 §7)
  unconfirmed: { count: number; oldestSince: string | null };
}

export async function listCases(query: CaseQuery): Promise<CaseList> {
  const pool = await db();
  const rows = await pool.query<RawRow>(
    `SELECT ${COLUMNS}, count(*) OVER () AS total
       FROM test_case
      WHERE tc_id LIKE $1
        AND ($2 = '' OR tc_id ILIKE $3 ESCAPE '\\' OR name ILIKE $3 ESCAPE '\\')
        AND (NOT $4::boolean OR is_active)
        AND ($5::jsonb IS NULL OR platforms @> $5::jsonb)
      ORDER BY tc_id
      LIMIT $6 OFFSET $7`,
    [
      `${query.service}-%`,
      query.q,
      literal(query.q),
      query.activeOnly,
      query.platform === undefined ? null : JSON.stringify([query.platform]),
      query.pageSize,
      (query.page - 1) * query.pageSize,
    ],
  );

  const summary = await pool.query<{ count: string; oldest: Date | null }>(
    `SELECT count(*) AS count, min(unconfirmed_since) AS oldest
       FROM test_case
      WHERE tc_id LIKE $1 AND is_active AND unconfirmed IS NOT NULL`,
    [`${query.service}-%`],
  );

  return {
    items: rows.rows.map(toCase),
    total: Number(rows.rows[0]?.total ?? 0),
    totalIsExact: true,
    sort: 'tcId',
    page: query.page,
    pageSize: query.pageSize,
    unconfirmed: {
      count: Number(summary.rows[0]?.count ?? 0),
      oldestSince: summary.rows[0]?.oldest?.toISOString() ?? null,
    },
  };
}

export async function findCase(tcId: string): Promise<CaseRow | null> {
  const pool = await db();
  // 비활성 케이스도 돌려준다. 과거 실행 이력이 상세 화면을 열 때 이 경로를 쓴다
  const rows = await pool.query<RawRow>(`SELECT ${COLUMNS} FROM test_case WHERE tc_id = $1`, [tcId]);
  const row = rows.rows[0];
  return row === undefined ? null : toCase(row);
}

export interface ServiceRow {
  id: number;
  prefix: string;
  name: string;
  testsDir: string;
}

// 서비스는 지우지 않고 비활성으로 내린다. 내려간 서비스의 케이스는 더 훑지 않는다 (SPEC §8.8)
export async function activeServices(): Promise<ServiceRow[]> {
  const pool = await db();
  const rows = await pool.query<{ id: string; prefix: string; name: string; tests_dir: string }>(
    'SELECT id, prefix, name, tests_dir FROM service WHERE is_active ORDER BY prefix',
  );
  return rows.rows.map((r) => ({ id: Number(r.id), prefix: r.prefix, name: r.name, testsDir: r.tests_dir }));
}

export async function findService(prefix: string): Promise<ServiceRow | null> {
  const found = await activeServices();
  return found.find((s) => s.prefix === prefix) ?? null;
}

export async function save(specs: CaseSpec[], deactivateMissing: boolean, prefix: string): Promise<SaveResult> {
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
        spec.unconfirmed ?? null,
      ]);
      if (upserted.rows[0]?.inserted === true) added += 1;
    }

    // 코드에서 사라진 케이스는 지우지 않는다. 과거 실행 이력이 참조하므로 비활성으로만 둔다 (SPEC §3.1).
    // 스캔 결과가 통째로 비면 마운트가 빠진 쪽이 훨씬 그럴듯하므로 카탈로그를 전부 내리지 않는다.
    // 범위는 이 서비스의 접두사 안이다 — 서비스마다 자기 폴더만 훑으므로(§9.2) 전체를 범위로 잡으면
    // 한 서비스를 스캔할 때 다른 서비스의 케이스가 통째로 내려간다
    let deactivated = 0;
    if (deactivateMissing && specs.length > 0) {
      const dropped = await client.query(
        `UPDATE test_case SET is_active = false
          WHERE is_active = true AND tc_id LIKE $2 AND tc_id <> ALL($1::text[])`,
        [specs.map((s) => s.tcId), `${prefix}-%`],
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

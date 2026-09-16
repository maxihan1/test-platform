// 저장된 입력값 묶음 (SPEC §6 param_set). 파라미터마다 행을 쪼개지 않고 JSONB 통째로 둔다
// 케이스 스키마는 카탈로그가 채운 test_case에서 SQL로 읽는다 — 카탈로그 코드를 import 하지 않는다 (컨텍스트 경계)

import type { JsonSchema } from '@platform/kit';

import type { Pool } from 'pg';

export interface ParamSetRow {
  id: number;
  tcId: string;
  name: string;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  createdAt: string;
}

export interface CaseSchemas {
  paramSchema: JsonSchema;
  expectedSchema: JsonSchema;
}

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export async function caseSchemas(tcId: string): Promise<CaseSchemas | null> {
  const pool = await db();
  const rows = await pool.query<{ param_schema: JsonSchema; expected_schema: JsonSchema }>(
    'SELECT param_schema, expected_schema FROM test_case WHERE tc_id = $1',
    [tcId],
  );
  const row = rows.rows[0];
  return row === undefined ? null : { paramSchema: row.param_schema, expectedSchema: row.expected_schema };
}

interface RawRow {
  id: string;
  tc_id: string;
  name: string;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  created_at: Date;
}

function toRow(row: RawRow): ParamSetRow {
  return {
    id: Number(row.id),
    tcId: row.tc_id,
    name: row.name,
    params: row.params,
    expected: row.expected,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listParamSets(tcId: string): Promise<ParamSetRow[]> {
  const pool = await db();
  const rows = await pool.query<RawRow>(
    'SELECT id, tc_id, name, params, expected, created_at FROM param_set WHERE tc_id = $1 ORDER BY created_at, id',
    [tcId],
  );
  return rows.rows.map(toRow);
}

// UNIQUE (tc_id, name) 위반은 사람이 같은 이름을 또 쓴 것이다. 고장이 아니므로 null로 갈라 알린다
export async function createParamSet(
  tcId: string,
  name: string,
  params: Record<string, unknown>,
  expected: Record<string, unknown>,
): Promise<ParamSetRow | null> {
  const pool = await db();
  const rows = await pool.query<RawRow>(
    `INSERT INTO param_set (tc_id, name, params, expected) VALUES ($1, $2, $3, $4)
     ON CONFLICT (tc_id, name) DO NOTHING
     RETURNING id, tc_id, name, params, expected, created_at`,
    [tcId, name, JSON.stringify(params), JSON.stringify(expected)],
  );
  const row = rows.rows[0];
  return row === undefined ? null : toRow(row);
}

export async function deleteParamSet(id: number): Promise<boolean> {
  const pool = await db();
  const result = await pool.query('DELETE FROM param_set WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// 케이스마다 한 벌 저장하는 실행 입력값(case_input) — 저장·지우기 통로와 실행을 만들 때 빈 칸 채우기 (도메인/실행 §3.2 · §7)

import { isDeepStrictEqual } from 'node:util';

import type { JsonSchema } from '@platform/kit';

import type { FastifyInstance } from 'fastify';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';

// 화면이 가리는 칸과 서버가 응답에서 빼는 칸이 같아야 한다. 판단을 둘로 두면 한쪽만 고쳐진다
import { 가려야하나 } from '../web/mask.js';
import { caseSchemas } from './paramSets.js';
import type { RunItemInput } from './store.js';
import { validate } from './validate.js';

type 값들 = Record<string, unknown>;

export interface SavedInput {
  params: 값들;
  expected: 값들;
  savedSecrets: string[];
  savedBy: string;
  savedAt: string;
}

const body = z.object({
  params: z.record(z.string(), z.unknown()).default({}),
  expected: z.record(z.string(), z.unknown()).default({}),
});

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

function isPlainObject(value: unknown): value is 값들 {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function 칸들(schema: unknown): Record<string, 값들> {
  const properties = isPlainObject(schema) && isPlainObject(schema.properties) ? schema.properties : {};
  return Object.fromEntries(Object.entries(properties).map(([k, v]) => [k, isPlainObject(v) ? v : {}]));
}

// 손 안 댄 코드 기본값까지 저장하면 코드가 기본값을 바꿔도 옛 값이 계속 실행에 쓰인다
function 기본값뺀것(schema: JsonSchema, 값: 값들): 값들 {
  const 칸 = 칸들(schema);
  return Object.fromEntries(Object.entries(값).filter(([k, v]) => !isDeepStrictEqual(v, 칸[k]?.default)));
}

// 목록 응답은 서비스 전체 분량이라 비밀값 원문을 싣지 않는다. 원문은 실행을 만들 때 서버만 쓴다
function 비밀값뺀것(schema: JsonSchema, 값: 값들): { 보일것: 값들; 비밀: string[] } {
  const 칸 = 칸들(schema);
  const 비밀 = Object.keys(값).filter((k) => 가려야하나(k, 칸[k] ?? {}));
  return { 보일것: Object.fromEntries(Object.entries(값).filter(([k]) => !비밀.includes(k))), 비밀 };
}

function 비밀값만(schema: JsonSchema, 값: 값들): 값들 {
  const 칸 = 칸들(schema);
  return Object.fromEntries(Object.entries(값).filter(([k]) => 칸[k] !== undefined && 가려야하나(k, 칸[k])));
}

async function 저장한다(tcId: string, schemas: { paramSchema: JsonSchema; expectedSchema: JsonSchema }, params: 값들, expected: 값들, savedBy: string): Promise<SavedInput | null> {
  const pool = await db();
  const 남은입력 = 기본값뺀것(schemas.paramSchema, params);
  const 남은기대 = 기본값뺀것(schemas.expectedSchema, expected);
  if (Object.keys(남은입력).length === 0 && Object.keys(남은기대).length === 0) {
    await pool.query('DELETE FROM case_input WHERE tc_id = $1', [tcId]);
    return null;
  }

  const r = await pool.query<{ saved_at: Date }>(
    `INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (tc_id) DO UPDATE SET params = EXCLUDED.params, expected = EXCLUDED.expected,
                                       saved_by = EXCLUDED.saved_by, saved_at = now()
     RETURNING saved_at`,
    [tcId, JSON.stringify(남은입력), JSON.stringify(남은기대), savedBy],
  );
  const 입력 = 비밀값뺀것(schemas.paramSchema, 남은입력);
  const 기대 = 비밀값뺀것(schemas.expectedSchema, 남은기대);
  return {
    params: 입력.보일것,
    expected: 기대.보일것,
    savedSecrets: [...입력.비밀, ...기대.비밀],
    savedBy,
    savedAt: r.rows[0]!.saved_at.toISOString(),
  };
}

// routes.ts 가 300줄에 닿아 등록을 여기로 뗐다. 권한은 문(auth/routeTable.ts · scope.ts)이 본다
export function 저장값통로(app: FastifyInstance): void {
  app.put<{ Params: { tcId: string } }>('/cases/:tcId/saved-input', async (req, reply) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    const { tcId } = req.params;
    const schemas = await caseSchemas(tcId);
    if (schemas === null) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: tcId });

    // 화면은 저장된 비밀값을 받지 못해 다시 보낼 수 없다. 안 보낸 비밀값 칸은 앞 저장값을 이어받는다 —
    // 안 그러면 다시 저장하는 순간 비밀번호가 지워진다. 지우려면 DELETE 로 통째로 되돌린다
    const 앞 = (await (await db()).query<{ params: 값들; expected: 값들 }>(
      'SELECT params, expected FROM case_input WHERE tc_id = $1',
      [tcId],
    )).rows[0];
    const params = { ...비밀값만(schemas.paramSchema, 앞?.params ?? {}), ...parsed.data.params };
    const expected = { ...비밀값만(schemas.expectedSchema, 앞?.expected ?? {}), ...parsed.data.expected };

    // param-sets 저장과 같은 검증이다. 어긋난 값이 저장되면 정기 실행에서 몇 주 뒤에 터진다
    const violations = [...validate(schemas.paramSchema, params), ...validate(schemas.expectedSchema, expected)];
    if (violations.length > 0) {
      return reply.code(400).send({ error: 'INVALID_PARAMS', detail: violations[0]!.message, violations });
    }

    // 문 없이 이 라우트만 띄우는 검사에서만 사람이 비어 있다 (execution/routes.ts POST /runs 와 같다)
    return 저장한다(tcId, schemas, params, expected, req.user?.username ?? '알 수 없음');
  });

  app.delete<{ Params: { tcId: string } }>('/cases/:tcId/saved-input', async (req, reply) => {
    await (await db()).query('DELETE FROM case_input WHERE tc_id = $1', [req.params.tcId]);
    return reply.code(204).send();
  });
}

// 저장 뒤 명세가 바뀌면 옛 값이 실행을 깨뜨리고 원인이 DB 한 줄에 숨는다. 지금 명세로 칸마다 걸러 맞는 칸만 채운다
function 채운것(schema: unknown, 요청: 값들, 저장: unknown): 값들 {
  if (!isPlainObject(저장)) return 요청;
  const 칸 = 칸들(schema);
  const 더할것 = Object.entries(저장).filter(
    ([k, v]) => !Object.hasOwn(요청, k) && 칸[k] !== undefined && validate({ properties: { [k]: 칸[k] } }, { [k]: v }).length === 0,
  );
  return { ...요청, ...Object.fromEntries(더할것) };
}

/** 요청에 없는 칸만 케이스 저장값으로 채운 새 항목 목록. 정기 실행처럼 화면을 안 거치는 실행도 같은 길을 탄다 */
export async function 저장값을채운다(
  client: PoolClient,
  items: RunItemInput[],
  schemas: Map<string, { param_schema: unknown; expected_schema: unknown }>,
): Promise<RunItemInput[]> {
  const r = await client.query<{ tc_id: string; params: unknown; expected: unknown }>(
    'SELECT tc_id, params, expected FROM case_input WHERE tc_id = ANY($1::text[])',
    [items.map((i) => i.tcId)],
  );
  const 저장 = new Map(r.rows.map((row) => [row.tc_id, row]));
  return items.map((item) => {
    const 행 = 저장.get(item.tcId);
    const 명세 = schemas.get(item.tcId);
    if (행 === undefined || 명세 === undefined) return item;
    return {
      ...item,
      params: 채운것(명세.param_schema, item.params, 행.params),
      expected: 채운것(명세.expected_schema, item.expected, 행.expected),
    };
  });
}

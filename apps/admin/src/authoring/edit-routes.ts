// 케이스 고치기 요청 통로 — 카탈로그 · 테스트 계정으로 검사한 뒤 서비스 잠금 안에서 겹침 확인과 넣기 (SPEC 도메인/작성 §3.6 「★ 케이스 고치기」 · §7)
// app.ts 가 routes.ts 와 같은 /api 접두사로 등록한다. routes.ts 가 300줄에 닿아 따로 뗐다

import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';

import { 고치기상한, 고칠것검사, type 고칠것, type 고치기판, type 케이스정보 } from './edit.js';
import { 사슬식, 최신식 } from './history.js';
import { 열린작성, 케이스쓴열린작성, 케이스쥔열린작성 } from './openRoots.js';
import { 서비스번호 } from './routes.js';
import { db, 줄세우기 } from './store.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 검사에 쓸 카탈로그 행과 비밀번호. 상한을 넘는 본문은 어차피 거절되므로 상한까지만 읽는다 */
async function 판읽기(서비스: number, 접두사: string, 본문: unknown): Promise<고치기판> {
  const 줄들: unknown[] = isPlainObject(본문) && Array.isArray(본문.edits) ? 본문.edits.slice(0, 고치기상한) : [];
  const tcIds = 줄들.flatMap((줄) => (isPlainObject(줄) && typeof 줄.tcId === 'string' ? [줄.tcId] : []));
  const pool = await db();
  const 케이스 = await pool.query<{ tc_id: string; is_active: boolean; expected_schema: unknown; proc_id: string | null }>(
    `SELECT tc_id, is_active, expected_schema, proc_id FROM test_case WHERE tc_id = ANY($1::text[])`,
    [tcIds],
  );
  // 빈 비밀번호를 넣으면 빈 글자 기대값이 「비밀번호와 같다」로 막힌다 — 계정 없는 줄은 비교 대상이 아니다.
  // 역할 계정 비밀번호도 같은 비밀값이다 (§3.6 「★ 역할별 계정」)
  const 비번 = await pool.query<{ login_password: string }>(
    `SELECT login_password FROM service_env WHERE service_id = $1 AND COALESCE(login_password, '') <> ''
     UNION ALL
     SELECT a->>'loginPassword' FROM service_env e, jsonb_array_elements(e.role_accounts) a
      WHERE e.service_id = $1 AND COALESCE(a->>'loginPassword', '') <> ''`,
    [서비스],
  );
  return {
    케이스들: new Map<string, 케이스정보>(
      케이스.rows.map((r) => [
        r.tc_id,
        { tcId: r.tc_id, active: r.is_active, expectedSchema: r.expected_schema, procId: r.proc_id },
      ]),
    ),
    접두사,
    비밀번호들: 비번.rows.map((r) => r.login_password),
  };
}

/** 고칠 케이스가 든 프로시저 번호들과 그 프로시저의 살아 있는 케이스들 */
async function 같은프로시저(손: PoolClient, tcIds: string[]): Promise<{ 프로시저들: string[]; 케이스들: string[] }> {
  const r = await 손.query<{ tc_id: string; proc_id: string }>(
    `SELECT tc_id, proc_id FROM test_case WHERE is_active AND proc_id IN (SELECT proc_id FROM test_case WHERE tc_id = ANY($1::text[]) AND is_active)`,
    [tcIds],
  );
  return { 프로시저들: [...new Set(r.rows.map((x) => x.proc_id))], 케이스들: r.rows.map((x) => x.tc_id) };
}

/**
 * 열린 고치기 · 그 케이스를 다 쓴 열린 작성과 겹치지 않으면 EDIT 행을 넣는다. 확인과 넣기를 서비스 잠금 한 트랜잭션에서 —
 * 프로시저 안 케이스는 파일이 하나라 같은 프로시저의 케이스를 쥔 것까지 본다 (§3.6 「★ 테스트 프로시저 작성」 「겹치는 요청」).
 * 둘이 동시에 같은 tcId 를 요청하면 확인을 둘 다 통과해 같은 파일을 고치는 PR 이 둘 선다 (게이트 1 BLOCKER ⒜ · §3.6 「★ 결정 목록」 「서버 막기」)
 */
async function 세우기(
  서비스: number,
  edits: 고칠것[],
  누가: string,
  이름: string,
): Promise<{ id: number } | { 열린것: number[] }> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    await 손.query(`SELECT pg_advisory_xact_lock(hashtext('authoring-edit'), ($1::bigint % 2147483647)::int)`, [서비스]);
    const { 프로시저들, 케이스들 } = await 같은프로시저(손, edits.map((e) => e.tcId));
    const 볼케이스 = [...new Set([...edits.map((e) => e.tcId), ...케이스들])];
    // 열림 = 폐기 안 됨 · 최신 실행이 병합된 반영이 아님. 실패한 반영은 최신식이 건너뛴다
    const 열린 = await 손.query<{ id: string }>(
      `WITH RECURSIVE ${사슬식("service_id = $1 AND kind = 'EDIT' AND discarded_at IS NULL")}
       SELECT r.id FROM authoring_request r
        WHERE r.service_id = $1 AND r.kind = 'EDIT' AND r.discarded_at IS NULL
          AND EXISTS (SELECT 1 FROM unnest($2::text[]) t
                       WHERE r.params->'edits' @> jsonb_build_array(jsonb_build_object('tcId', t)))
          AND NOT EXISTS (SELECT 1 FROM authoring_request m
                           WHERE m.id = ${최신식('(SELECT id FROM 사슬 WHERE root_id = r.id)')}
                             AND m.kind = 'MERGE' AND m.status = 'DONE')
        ORDER BY r.id`,
      [서비스, 볼케이스],
    );
    const 작성 = await 케이스쓴열린작성(손, 서비스, 볼케이스, 프로시저들);
    const 쥔 = 케이스들.length === 0 ? [] : await 케이스쥔열린작성(손, 서비스, 케이스들);
    if (열린.rows.length + 작성.length + 쥔.length > 0) {
      await 손.query('ROLLBACK');
      return { 열린것: [...new Set([...열린.rows.map((r) => Number(r.id)), ...작성, ...쥔])].sort((a, b) => a - b) };
    }
    const r = await 손.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
       VALUES ($1, 'EDIT', $2, $3, $4, 'PENDING') RETURNING id`,
      [서비스, JSON.stringify({ edits }), 누가, 이름],
    );
    await 손.query('COMMIT');
    return { id: Number(r.rows[0]!.id) };
  } catch (e) {
    await 손.query('ROLLBACK');
    throw e;
  } finally {
    손.release();
  }
}

/**
 * 프로시저 안 케이스의 삭제를 작성 행으로 세운다 — 고치기는 케이스를 돌려 보지 않아 흐름이 깨져도 모른다.
 * 작성 요청이라 열린 작성이 하나라도 있으면 거절한다 (§3.6 「★ 테스트 프로시저 작성」 「삭제 작성 행」)
 */
async function 삭제작성세우기(서비스: number, cases: string[], 누가: string, 이름: string): Promise<{ id: number } | { 열린것: number[] }> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    const 열린것 = await 열린작성(서비스, 손);
    const 결과 = 열린것.length > 0 ? { 열린것 } : { id: await 줄세우기({ 서비스, kind: 'AUTHOR', 기획서: null, 값: { procDelete: { cases } }, 누가, 이름 }, 손) };
    await 손.query('COMMIT');
    return 결과;
  } catch (e) {
    await 손.query('ROLLBACK');
    throw e;
  } finally {
    손.release();
  }
}

export default async function authoringEditRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Querystring: { service?: string }; Body: unknown }>('/authoring/edits', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    // 서비스번호가 이 접두사를 정확히 찾았다 — 케이스가 이 서비스 것인지는 접두사로 가른다
    const 판 = await 판읽기(서비스, req.query.service ?? '', req.body);
    const 검사 = 고칠것검사(req.body, 판);
    if ('error' in 검사) return reply.code(400).send(검사);
    // 부른 사람은 본문에 안 싣는다. 로그인한 세션에서 채운다 — 작성 요청과 같다
    const 누가 = req.user?.username ?? '';
    const 이름 = req.user?.displayName ?? '';
    if ('procDelete' in 검사) {
      const 결과 = await 삭제작성세우기(서비스, 검사.procDelete, 누가, 이름);
      if ('열린것' in 결과) return reply.code(409).send({ error: 'AUTHORING_OPEN', detail: 결과.열린것 });
      return reply.code(201).send({ id: 결과.id });
    }
    const 결과 = await 세우기(서비스, 검사.edits, 누가, 이름);
    if ('열린것' in 결과) return reply.code(409).send({ error: 'EDIT_OPEN', detail: 결과.열린것 });
    return reply.code(201).send({ id: 결과.id });
  });
}

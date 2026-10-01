// 케이스 고치기 요청 통로 — 카탈로그 · 테스트 계정으로 검사한 뒤 서비스 잠금 안에서 겹침 확인과 넣기 (SPEC 도메인/작성 §3.6 「★ 케이스 고치기」 · §7)
// app.ts 가 routes.ts 와 같은 /api 접두사로 등록한다. routes.ts 가 300줄에 닿아 따로 뗐다

import type { FastifyInstance } from 'fastify';

import { 고치기상한, 고칠것검사, type 고칠것, type 고치기판, type 케이스정보 } from './edit.js';
import { 사슬식, 최신식 } from './history.js';
import { 서비스번호 } from './routes.js';
import { db } from './store.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 검사에 쓸 카탈로그 행과 비밀번호. 상한을 넘는 본문은 어차피 거절되므로 상한까지만 읽는다 */
async function 판읽기(서비스: number, 접두사: string, 본문: unknown): Promise<고치기판> {
  const 줄들: unknown[] = isPlainObject(본문) && Array.isArray(본문.edits) ? 본문.edits.slice(0, 고치기상한) : [];
  const tcIds = 줄들.flatMap((줄) => (isPlainObject(줄) && typeof 줄.tcId === 'string' ? [줄.tcId] : []));
  const pool = await db();
  const 케이스 = await pool.query<{ tc_id: string; is_active: boolean; unconfirmed: string | null; expected_schema: unknown }>(
    'SELECT tc_id, is_active, unconfirmed, expected_schema FROM test_case WHERE tc_id = ANY($1::text[])',
    [tcIds],
  );
  // 빈 비밀번호를 넣으면 빈 글자 기대값이 「비밀번호와 같다」로 막힌다 — 계정 없는 줄은 비교 대상이 아니다
  const 비번 = await pool.query<{ login_password: string }>(
    `SELECT login_password FROM service_env WHERE service_id = $1 AND COALESCE(login_password, '') <> ''`,
    [서비스],
  );
  return {
    케이스들: new Map<string, 케이스정보>(
      케이스.rows.map((r) => [
        r.tc_id,
        { tcId: r.tc_id, active: r.is_active, unconfirmed: r.unconfirmed, expectedSchema: r.expected_schema },
      ]),
    ),
    접두사,
    비밀번호들: 비번.rows.map((r) => r.login_password),
  };
}

/**
 * 열린 고치기와 겹치지 않으면 EDIT 행을 넣는다. 확인과 넣기를 서비스 잠금 한 트랜잭션에서 —
 * 둘이 동시에 같은 tcId 를 요청하면 확인을 둘 다 통과해 같은 파일을 고치는 PR 이 둘 선다 (게이트 1 BLOCKER ⒜)
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
      [서비스, edits.map((e) => e.tcId)],
    );
    if (열린.rows.length > 0) {
      await 손.query('ROLLBACK');
      return { 열린것: 열린.rows.map((r) => Number(r.id)) };
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

export default async function authoringEditRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Querystring: { service?: string }; Body: unknown }>('/authoring/edits', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    // 서비스번호가 이 접두사를 정확히 찾았다 — 케이스가 이 서비스 것인지는 접두사로 가른다
    const 판 = await 판읽기(서비스, req.query.service ?? '', req.body);
    const 검사 = 고칠것검사(req.body, 판);
    if ('error' in 검사) return reply.code(400).send(검사);
    // 부른 사람은 본문에 안 싣는다. 로그인한 세션에서 채운다 — 작성 요청과 같다
    const 결과 = await 세우기(서비스, 검사.edits, req.user?.username ?? '', req.user?.displayName ?? '');
    if ('열린것' in 결과) return reply.code(409).send({ error: 'EDIT_OPEN', detail: 결과.열린것 });
    return reply.code(201).send({ id: 결과.id });
  });
}

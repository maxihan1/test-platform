// PRD 초안 결과 통로 — 작성 에이전트가 낸 초안 줄을 검사해 그 요청의 result.draft 에 둔다 (도메인/BTS §7 「POST /api/authoring/requests/:id/draft」)

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

import { 집은쪽인가 } from '../authoring/agentRoutes.js';
import { 판하나 } from '../prd/store.js';

import { 맡은키들, 초안검사, 초안몸상한 } from './draft.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export default async function btsDraftRoutes(app: FastifyInstance): Promise<void> {
  // 초안상한(줄 200 × 글 2,000자 둘)이 한글로 2.4MB 안팎이라 기본 1MiB 로는 맞는 초안도 413 이다 — 넉넉히 연다
  app.post<{ Params: { id: string }; Body: unknown }>('/authoring/requests/:id/draft', { bodyLimit: 초안몸상한 }, async (req, reply) => {
    const 행 = await 집은쪽인가(req, reply);
    if (행 === null) return reply;
    const 서비스 = 행.serviceId;
    if (행.kind !== 'PRD_DRAFT' || 서비스 === null) return reply.code(400).send({ error: 'BAD_KIND', detail: 행.kind });
    if (행.status !== 'RUNNING') return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
    // 번호는 자식이 읽은 판으로 본다 — 도는 사이 사람이 새 판을 저장해도 초안이 본 판과 견준다(0 은 PRD 가 아직 없음)
    const { prdVersion, ...몸 } = (req.body ?? {}) as { prdVersion?: unknown };
    if (typeof prdVersion !== 'number' || !Number.isSafeInteger(prdVersion) || prdVersion < 0) return reply.code(400).send({ error: 'BAD_DRAFT', detail: 'prdVersion' });
    const pool = await db();
    const [접두사들, 판] = await Promise.all([
      pool.query<{ prefix: string }>('SELECT prefix FROM service WHERE project_id = (SELECT project_id FROM service WHERE id = $1)', [서비스]),
      prdVersion === 0 ? null : 판하나(서비스, prdVersion),
    ]);
    if (prdVersion > 0 && 판 === null) return reply.code(400).send({ error: 'BAD_DRAFT', detail: 'prdVersion' });
    const 꼴 = 초안검사(몸, new Set(맡은키들(행.params)), new Set((판?.items ?? []).map((x) => x.reqId)), new Set(접두사들.rows.map((x) => x.prefix)));
    if (!꼴.ok) return reply.code(400).send({ error: 꼴.error, detail: 꼴.detail });
    // 끝내기와 엇갈려도 끝난 줄에 초안이 붙지 않게 한 문장으로 — 끝내기가 먼저면 0 줄이다
    const r = await pool.query(
      `UPDATE authoring_request SET result = jsonb_build_object('draft', $2::jsonb, 'prdVersion', $3::int) WHERE id = $1 AND status = 'RUNNING'`,
      [행.id, JSON.stringify(꼴.초안), prdVersion],
    );
    if (r.rowCount !== 1) return reply.code(409).send({ error: 'NOT_RUNNING', detail: '' });
    return reply.code(201).send({ rows: 꼴.초안.rows.length });
  });
}

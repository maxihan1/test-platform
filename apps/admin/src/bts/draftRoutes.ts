// PRD 초안 결과 통로 — 작성 에이전트가 낸 초안 줄을 검사해 그 요청의 result.draft 에 둔다 (도메인/BTS §7 「POST /api/authoring/requests/:id/draft」)

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

import { 집은쪽인가 } from '../authoring/agentRoutes.js';
import { 지금판 } from '../prd/store.js';

import { 맡은키들, 초안검사 } from './draft.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export default async function btsDraftRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string }; Body: unknown }>('/authoring/requests/:id/draft', async (req, reply) => {
    const 행 = await 집은쪽인가(req, reply);
    if (행 === null) return reply;
    const 서비스 = 행.serviceId;
    if (행.kind !== 'PRD_DRAFT' || 서비스 === null) return reply.code(400).send({ error: 'BAD_KIND', detail: 행.kind });
    if (행.status !== 'RUNNING') return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
    const pool = await db();
    const 접두사들 = (await pool.query<{ prefix: string }>(
      'SELECT prefix FROM service WHERE project_id = (SELECT project_id FROM service WHERE id = $1)',
      [서비스],
    )).rows.map((x) => x.prefix);
    const 판 = await 지금판(서비스);
    const 꼴 = 초안검사(req.body, new Set(맡은키들(행.params)), new Set((판?.items ?? []).map((x) => x.reqId)), new Set(접두사들));
    if (!꼴.ok) return reply.code(400).send({ error: 꼴.error, detail: 꼴.detail });
    // 끝내기와 엇갈려도 끝난 줄에 초안이 붙지 않게 한 문장으로 — 끝내기가 먼저면 0 줄이다
    const r = await pool.query(
      `UPDATE authoring_request SET result = jsonb_build_object('draft', $2::jsonb, 'prdVersion', $3::int) WHERE id = $1 AND status = 'RUNNING'`,
      [행.id, JSON.stringify(꼴.초안), 판?.version ?? null],
    );
    if (r.rowCount !== 1) return reply.code(409).send({ error: 'NOT_RUNNING', detail: '' });
    return reply.code(201).send({ rows: 꼴.초안.rows.length });
  });
}

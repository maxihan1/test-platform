// 노트 고치기 결과를 받는 통로 — 바뀐 문서만 받아 앞 판에 겹치고 새 판 하나를 만든다 (도메인/BTS §7 「POST /api/authoring/requests/:id/note」)

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { 집은쪽인가 } from '../authoring/agentRoutes.js';
import { 노트겹치기, type 노트문서 } from './note.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 길이 상한은 여기서 안 본다 — 노트겹치기가 NOTE_TOO_LONG 으로 이름 붙여 거절해야 AI 가 무엇을 나눌지 안다
const 몸꼴 = z.object({
  docs: z.array(z.object({ name: z.string(), summary: z.string(), body: z.string() }).strict()),
  remove: z.array(z.string()).optional(),
}).strict();

export default async function projectNoteRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string }; Body: unknown }>('/authoring/requests/:id/note', async (req, reply) => {
    const 행 = await 집은쪽인가(req, reply);
    if (행 === null) return reply;
    // 프로젝트 칸은 NOTE 와 그 RERUN 에만 찬다(authoring_request_project_kind_check)
    const projectId = 행.projectId;
    if (projectId === null || 행.status !== 'RUNNING') return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
    const 꼴 = 몸꼴.safeParse(req.body);
    if (!꼴.success) return reply.code(400).send({ error: 'BAD_NOTE', detail: 꼴.error.issues[0]?.path.join('.') ?? '' });

    const 손 = await (await db()).connect();
    try {
      await 손.query('BEGIN');
      // 프로젝트 행을 잠가 저장을 한 줄로 세운다 — 판 번호를 읽고 넣는 사이에 다른 저장이 끼면 둘이 같은 번호를 노린다(PK 가 마지막 그물)
      await 손.query('SELECT 1 FROM project WHERE id = $1 FOR UPDATE', [projectId]);
      // 잠근 뒤 다시 본다 — 그 사이 끝내기가 왔으면 끝난 일의 판을 만들지 않는다
      const 지금 = await 손.query<{ status: string }>('SELECT status FROM authoring_request WHERE id = $1', [행.id]);
      if (지금.rows[0]?.status !== 'RUNNING') {
        await 손.query('ROLLBACK');
        return reply.code(409).send({ error: 'NOT_RUNNING', detail: 지금.rows[0]?.status ?? '' });
      }
      const 앞 = await 손.query<{ version: number; docs: 노트문서[] }>(
        'SELECT version, docs FROM project_note WHERE project_id = $1 ORDER BY version DESC LIMIT 1',
        [projectId],
      );
      const 겹침 = 노트겹치기(앞.rows[0]?.docs ?? [], 꼴.data.docs, 꼴.data.remove ?? []);
      if (!겹침.ok) {
        await 손.query('ROLLBACK');
        return reply.code(400).send({ error: 겹침.error, detail: 겹침.detail });
      }
      const version = (앞.rows[0]?.version ?? 0) + 1;
      await 손.query('INSERT INTO project_note (project_id, version, docs, request_id) VALUES ($1, $2, $3, $4)', [
        projectId,
        version,
        JSON.stringify(겹침.docs),
        행.id,
      ]);
      await 손.query('COMMIT');
      return reply.code(201).send({ version });
    } catch (err) {
      await 손.query('ROLLBACK');
      throw err;
    } finally {
      손.release();
    }
  });
}

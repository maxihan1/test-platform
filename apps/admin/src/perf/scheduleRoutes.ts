// 성능 시나리오 정기 실행 켜기 · 끄기 통로 — admin 만 (도메인/성능 §7 「정기 실행」)

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 대상줄읽기 } from '../authoring/reverse.js';
import { 시간대확인, 틀린시간대 } from '../reporting/dashboardResults.js';
import { 정수 } from '../routeParams.js';
import { 정기실행재료 } from './schedule.js';
import { 풀 } from './store.js';
import type { ScenarioBody } from './types.js';

const 본문 = z.union([z.null(), z.object({ at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), tz: z.string().min(1).max(100), env: z.string().min(1).max(100) })]);

export default async function perfScheduleRoutes(app: FastifyInstance): Promise<void> {
  app.put<{ Params: { id: string } }>('/perf/scenarios/:id/schedule', async (req, reply) => {
    const id = 정수(req.params.id);
    const p = 본문.safeParse(req.body);
    if (id === null || !p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.success ? req.params.id : p.error.message });
    const pool = await 풀();
    const s = await pool.query<{ service_id: string; body: ScenarioBody }>(
      `SELECT s.service_id, v.body FROM perf_scenario s JOIN perf_scenario_version v ON v.scenario_id = s.id AND v.version = s.version
        WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [id],
    );
    const 줄 = s.rows[0];
    if (줄 === undefined) return reply.code(404).send({ error: 'NOT_FOUND' });
    if (p.data === null) {
      await pool.query('UPDATE perf_scenario SET schedule_at = NULL, schedule_tz = NULL, schedule_env = NULL WHERE id = $1', [id]);
      return { schedule: null };
    }
    const { at, tz, env } = p.data;
    try {
      await 시간대확인(pool, tz);
    } catch (e) {
      if (e instanceof 틀린시간대) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `tz: ${tz}` });
      throw e;
    }
    const 대상 = await 대상줄읽기(Number(줄.service_id), env);
    if (대상 === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `env: ${env}` });
    if (대상.isProd) return reply.code(400).send({ error: 'PROD_ENV_BLOCKED' });
    const 재료 = 정기실행재료(id, env, 줄.body);
    if ('error' in 재료) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 재료.error });
    await pool.query('UPDATE perf_scenario SET schedule_at = $2, schedule_tz = $3, schedule_env = $4 WHERE id = $1', [id, at, tz, env]);
    return { schedule: { at, tz, env } };
  });
}

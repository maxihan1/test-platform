// 페이지 성능 통로 — 단독 측정 만들기 · 측정값 읽기 (도메인/성능 §7). 셈과 표는 pages.ts — 엔진이 그 파일을 불러 서로 물리지 않게 뗐다

import type { FastifyInstance } from 'fastify';

import { 정수 } from '../routeParams.js';
import { 한번돌기 } from './engine.js';
import { 견줄것, 측정본문, 측정세우기, 페이지줄읽기 } from './pages.js';
import * as 표 from './store.js';
import type { PageRunConfig } from './types.js';

export default async function perfPageRoutes(app: FastifyInstance): Promise<void> {
  app.post('/perf/pages/measure', async (req, reply) => {
    const p = 측정본문.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.error.message });
    const r = await 측정세우기(p.data, { username: req.user?.username ?? null, name: req.user?.displayName ?? null });
    if ('error' in r) return reply.code(r.status).send(r.detail === undefined ? { error: r.error } : { error: r.error, detail: r.detail });
    void 한번돌기().catch((e: unknown) => req.log.error(e, '성능 실행 살피기 실패'));
    return reply.code(201).send({ runId: r.runId });
  });

  app.get<{ Params: { id: string } }>('/perf/runs/:id/pages', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    const run = await 표.실행하나(id);
    if (run === null) return reply.code(404).send({ error: 'NOT_FOUND' });
    const pages = run.kind === 'PAGE' ? (run.config as unknown as PageRunConfig).pages : (run.config.pages?.pages ?? []);
    return { pages: await 페이지줄읽기(id, pages), compare: await 견줄것(run) };
  });
}

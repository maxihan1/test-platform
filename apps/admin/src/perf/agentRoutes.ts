// 부하 발생 · 모니터링 에이전트가 부르는 통로 — 문이 pga_ 토큰으로 req.perfAgent 를 실어 준다 (도메인/성능 §5.4)

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { 정수 } from '../routeParams.js';
import { 끝받기, 부하숫자받기, 서버숫자받기, 일받기 } from './engine.js';
import { HIST_BUCKETS } from './hist.js';
import { 풀 } from './store.js';

const 연락 = z.object({ version: z.string().max(40), host: z.string().max(255), maxVus: z.number().int().positive().max(100_000).optional() });
const 초 = z.number().int().min(0).max(90_000);
const 수 = z.number().int().min(0).max(2 ** 31 - 1);
const 부하 = z.object({
  sec: 초,
  vus: 수,
  // 이름이 비면 전체 줄('')과, 겹치면 서로 같은 행을 두 번 고쳐 그 초가 통째로 거절된다
  txs: z.array(z.object({ name: z.string().min(1).max(200), requests: 수, errors: 수, hist: z.array(수).length(HIST_BUCKETS) })).max(500)
    .refine((txs) => new Set(txs.map((t) => t.name)).size === txs.length, '트랜잭션 이름이 겹칩니다'),
});
const 퍼센트 = z.number().min(0).max(1000);
const 모니터링 = z.object({ sec: 초, cpu: 퍼센트, mem: 퍼센트, diskIoKbps: z.number().min(0), netInKbps: z.number().min(0), netOutKbps: z.number().min(0) });
const 끝 = z.object({ status: z.enum(['OK', 'ERROR']), reason: z.string().max(2000).optional() });

type 실행경로 = { Params: { runId: string } };

function 실행번호(req: FastifyRequest<실행경로>, reply: FastifyReply): number | null {
  const id = 정수(req.params.runId);
  if (id === null) void reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.runId });
  return id;
}

export default async function perfAgentRoutes(app: FastifyInstance): Promise<void> {
  app.post('/perf/agent/hello', async (req, reply) => {
    const agent = req.perfAgent;
    const 본문 = 연락.safeParse(req.body);
    if (agent === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    if (!본문.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 본문.error.message });
    // 에이전트가 알린 최대 가상 사용자는 빈 칸만 채운다 — 사람이 설정에서 고친 값이 이긴다 (PERF-F1-03 시작 질문)
    await (await 풀()).query(
      `UPDATE perf_agent SET host = $2, version = $3, max_vus = CASE WHEN mode = 'LOAD' THEN COALESCE(max_vus, $4) END WHERE id = $1`,
      [agent.id, 본문.data.host, 본문.data.version, 본문.data.maxVus ?? null],
    );
    return { agentId: agent.id, name: agent.name, mode: agent.mode, serverTime: new Date().toISOString() };
  });

  app.post('/perf/agent/claim', async (req, reply) => {
    const agent = req.perfAgent;
    if (agent === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    return { job: 일받기(agent.id, agent.mode) };
  });

  app.post<실행경로>('/perf/agent/runs/:runId/metrics', async (req, reply) => {
    const agent = req.perfAgent;
    if (agent === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    const runId = 실행번호(req, reply);
    if (runId === null) return reply;
    if (agent.mode === 'MONITOR') {
      const m = 모니터링.safeParse(req.body);
      if (!m.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: m.error.message });
      return { stop: await 서버숫자받기(agent, runId, m.data) };
    }
    const m = 부하.safeParse(req.body);
    if (!m.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: m.error.message });
    return { stop: await 부하숫자받기(agent.id, runId, m.data) };
  });

  app.post<실행경로>('/perf/agent/runs/:runId/done', async (req, reply) => {
    const agent = req.perfAgent;
    if (agent === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    const runId = 실행번호(req, reply);
    if (runId === null) return reply;
    const 본문 = 끝.safeParse(req.body);
    if (!본문.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 본문.error.message });
    await 끝받기(agent.id, runId, 본문.data);
    return reply.code(204).send();
  });
}

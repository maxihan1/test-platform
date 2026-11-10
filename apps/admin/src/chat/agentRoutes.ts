// 작성 서버가 Scout 질문을 가져가고 답 조각 · 끝을 알리는 통로 셋 (도메인/챗봇 §7 「작성 서버」)

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 작성계정인가 } from '../auth/agentToken.js';
import { 정수 } from '../routeParams.js';
import { 조각넣기, 질문가져가기, 질문끝내기 } from './agentStore.js';

// NUL 글자는 Postgres TEXT 가 받지 않는다 — 조각 묶음째 500 이 나지 않게 400 으로 돌려보낸다
const 글 = (최소: number, 최대: number) => z.string().min(최소).max(최대).refine((v) => !v.includes('\u0000'), 'NUL 글자');
const 단계몸 = z.object({ tool: 글(1, 100), ref: 글(1, 100).optional() }).strict();
const 조각들 = z
  .object({
    chunks: z
      .array(
        z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('TEXT'), body: 글(1, 20_000) }),
          z.object({ kind: z.enum(['STEP', 'STEP_DONE']), body: 단계몸 }),
        ]),
      )
      .min(1)
      .max(200),
  })
  .strict();
const 셈 = z.number().int().min(0);
const 끝 = z
  .object({
    status: z.enum(['DONE', 'TIMEOUT', 'FAILED']),
    error: 글(0, 1000).optional(),
    usage: z
      .object({
        tokensInput: 셈,
        tokensOutput: 셈,
        tokensCacheRead: 셈,
        tokensCacheWrite: 셈,
        model: 글(0, 100),
        toolCalls: 셈.max(2_147_483_647),
        durationMs: 셈.max(2_147_483_647),
      })
      .strict(),
  })
  .strict();

type 번호경로 = { Params: { id: string } };

export default async function chatAgentRoutes(app: FastifyInstance): Promise<void> {
  // 권한만 걸면 작성 권한이 있는 아무나 남의 질문 글을 가져간다 — 작성 에이전트 계정만 부른다 (성능 AI 일과 같은 규칙 · 인증 §7)
  app.addHook('preHandler', async (req, reply) => {
    if (!작성계정인가(req.user?.username ?? '')) return reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });
  });

  app.post('/chat/agent/claim', async (req) => ({ question: await 질문가져가기(req.user!.username) }));

  app.post<번호경로>('/chat/agent/questions/:id/chunks', async (req, reply) => {
    const id = 정수(req.params.id);
    const p = 조각들.safeParse(req.body);
    if (id === null || !p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.success ? req.params.id : p.error.message });
    // 중단 · 시간 초과로 끝났거나 지워진 질문도 404 가 아니라 이것이다 — 작성 서버는 자식을 끄고 finish 를 부른다
    if (!(await 조각넣기(id, p.data.chunks))) return reply.code(409).send({ error: 'STOPPED' });
    return reply.code(204).send();
  });

  app.post<번호경로>('/chat/agent/questions/:id/finish', async (req, reply) => {
    const id = 정수(req.params.id);
    const p = 끝.safeParse(req.body);
    if (id === null || !p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.success ? req.params.id : p.error.message });
    await 질문끝내기(id, p.data.status, p.data.error ?? null, p.data.usage);
    return reply.code(204).send();
  });
}

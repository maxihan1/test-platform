// 수정 PR 상태 통로 — 수정 AI 가 연 PR 이 병합됐는지 닫혔는지를 작성 에이전트가 1분에 한 번 GitHub 에서 읽어 적는다. 서버는 GitHub 열쇠가 없다 (도메인/BTS §7 · BTS-F8-01 시작 질문)

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 작성계정인가 } from '../auth/agentToken.js';
import { 번호 } from '../authoring/params.js';
import { 서비스번호 } from '../authoring/routes.js';

import { 수정PR볼것, 수정PR상태적기 } from './quality.js';

const 상태몸 = z.object({ state: z.enum(['MERGED', 'CLOSED']) }).strict();

export default async function btsQualityRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { service?: string } }>('/authoring/requests/bugfix-prs', async (req, reply) => {
    // 닫을 PR 목록과 같다 — 맥 계정이 아니면 남의 PR 주소 목록을 볼 까닭이 없다
    if (!작성계정인가(req.user?.username ?? '')) return reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    return { prs: await 수정PR볼것(서비스) };
  });

  // 그 행의 애플리케이션 배정은 문이 본다(scope.ts 「작성요청」)
  app.post<{ Params: { id: string }; Body: unknown }>('/authoring/requests/:id/pr-state', async (req, reply) => {
    if (!작성계정인가(req.user?.username ?? '')) return reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });
    const id = 번호(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'BAD_ID' });
    const 꼴 = 상태몸.safeParse(req.body);
    if (!꼴.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'state' });
    if (!(await 수정PR상태적기(id, 꼴.data.state))) return reply.code(404).send({ error: 'NOT_FOUND' });
    return reply.code(204).send();
  });
}

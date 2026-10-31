// 닫을 PR 통로 — 다시 배포로 거둔 롤백 되돌림 요청의 PR 을 작성 에이전트가 1분에 한 번 묻고 닫는다. 서버는 GitHub 열쇠가 없다 (도메인/BTS §7 · BTS-F7-01 시작 질문 2)

import type { FastifyInstance } from 'fastify';

import { 작성계정인가 } from '../auth/agentToken.js';
import { 번호 } from '../authoring/params.js';
import { 서비스번호 } from '../authoring/routes.js';

import { PR닫음적기, 닫을PR } from './rollback.js';

export default async function btsRollbackRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { service?: string } }>('/authoring/requests/closing', async (req, reply) => {
    // 집기와 같다 — 맥 계정이 아니면 남의 PR 주소 목록을 볼 까닭이 없다
    if (!작성계정인가(req.user?.username ?? '')) return reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    return { prs: await 닫을PR(서비스) };
  });

  // 그 행의 애플리케이션 배정은 문이 본다(scope.ts 「작성요청」)
  app.post<{ Params: { id: string } }>('/authoring/requests/:id/closed', async (req, reply) => {
    if (!작성계정인가(req.user?.username ?? '')) return reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });
    const id = 번호(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'BAD_ID' });
    if (!(await PR닫음적기(id))) return reply.code(404).send({ error: 'NOT_FOUND' });
    return reply.code(204).send();
  });
}

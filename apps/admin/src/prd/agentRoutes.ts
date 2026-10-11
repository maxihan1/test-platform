// 작성 에이전트가 부르는 표준 기획서 통로 — 그 요청 서비스의 지금 판 · 기준 판 읽기 · 옮기기 결과 올리기 (도메인/작성 §7 「표준 기획서 통로」)
// 서비스 경계는 문이 요청 번호로 봤다. 여기서는 맥 계정 · 집은 쪽 · 도는 중인지를 본다(authoring/agentRoutes.ts 와 같은 문턱)

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { 집은쪽인가 } from '../authoring/agentRoutes.js';
import type { 요청 } from '../authoring/store.js';
import { 누가, 판번호, 틀린판번호 } from './routes.js';
import { 본문상한, 항목검사, 화면번호들 } from './rules.js';
import { 기준판, 서비스접두사, 옮기기, 읽은판, 지금판, 판하나 } from './store.js';

type 경로 = { Params: { id: string } };

/** 맥 계정 · 집은 쪽 · 도는 중. 본문보다 먼저 본다 — 끝난 요청에는 본문 모양과 상관없이 409 다 */
async function 도는집은요청(req: FastifyRequest, reply: FastifyReply): Promise<요청 | null> {
  const 행 = await 집은쪽인가(req, reply);
  if (행 === null) return null;
  if (행.status === 'RUNNING') return 행;
  await reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
  return null;
}

export default async function prdAgentRoutes(app: FastifyInstance): Promise<void> {
  app.get<경로>('/authoring/requests/:id/prd', async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    // 기준 판은 반영 요청이 바뀐 항목과 옛 문장(설계가 바뀐 종류)을 알려고 읽는다 — 화면의 「반영 안 됨」과 같은 기준이다.
    // 반영 요청은 집을 때 적은 판을 읽는다 — 그 사이 사람이 저장한 판까지 넣으면 병합 뒤에도 그 고침이 「반영 안 됨」으로 남는다
    const 적은판 = 행.params.prdApply === true ? await 읽은판(행.id) : null;
    const [판, base] = await Promise.all([적은판 === null ? 지금판(행.serviceId) : 판하나(행.serviceId, 적은판), 기준판(행.serviceId)]);
    return { version: 판?.version ?? 0, items: 판?.items ?? [], base };
  });

  app.post<경로 & { Body: Record<string, unknown> | null }>(
    '/authoring/requests/:id/prd',
    { bodyLimit: 본문상한 },
    async (req, reply) => {
      const 행 = await 도는집은요청(req, reply);
      if (행 === null) return reply;
      const baseVersion = 판번호(req.body?.baseVersion);
      if (baseVersion === null) return 틀린판번호(reply, 'baseVersion');
      const 접두사 = await 서비스접두사(행.serviceId);
      const 읽음 = 항목검사(req.body?.items, 접두사);
      if ('error' in 읽음) return reply.code(400).send(읽음);
      // 화면이 맞음 요청이면 그 번호의 바뀐 항목을 서버가 확정 · 사람이 고친 것으로 단다 — 본문이 아니라 요청 행에서 읽는다
      const 결과 = await 옮기기(행.id, 행.serviceId, 접두사, baseVersion, 읽음.items, 누가(req), 화면번호들(행.params));
      if (!('error' in 결과)) return 결과;
      return reply.code(결과.error === 'NOT_RUNNING' ? 409 : 400).send(결과);
    },
  );
}

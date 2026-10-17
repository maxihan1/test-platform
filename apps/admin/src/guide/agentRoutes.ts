// 작성 에이전트가 부르는 서비스 가이드 통로 — 그 요청 서비스의 지금 판과 첨부 (도메인/작성 §7 「서비스 가이드 통로」)
// 문턱은 표준 기획서 통로와 같다(prd/agentRoutes.ts `도는집은요청` — 맥 계정 · 집은 쪽 · 도는 중)

import type { FastifyInstance } from 'fastify';

import { readFile } from 'node:fs/promises';

import { 번호 } from '../authoring/params.js';
import { 도는집은요청 } from '../prd/agentRoutes.js';
import { 가이드파일자리, 내려받기 } from './routes.js';
import { 지금가이드 } from './store.js';

export default async function guideAgentRoutes(app: FastifyInstance): Promise<void> {
  // 자식에게 필요 없는 사람 이름 · 크기 · 때는 안 싣는다 (공유계약 「서비스 가이드 타입」)
  app.get<{ Params: { id: string } }>('/authoring/requests/:id/guide', async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    const 판 = await 지금가이드(행.serviceId);
    return {
      version: 판.version,
      intro: 판.intro,
      policy: 판.policy,
      rules: 판.rules,
      files: 판.files.map((f) => ({ id: f.id, name: f.name, section: f.section })),
    };
  });

  // 지금 판에 든 파일만 — 뺀 파일은 사람이 변경 기록에서만 연다
  app.get<{ Params: { id: string; fileId: string } }>('/authoring/requests/:id/guide/files/:fileId', async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    const 번 = 번호(req.params.fileId);
    const 파일 = (await 지금가이드(행.serviceId)).files.find((f) => f.id === 번);
    if (파일 === undefined) return reply.code(404).send({ error: 'NOT_FOUND' });
    return 내려받기(reply, 파일.name, await readFile(가이드파일자리(행.serviceId, 파일)));
  });
}

// 결정 목록 통로 — 보기는 작성 read, 진행은 작성 write 이고 항목마다 더 드는 권한(admin · 실행 read · write)은 여기서 본다 (도메인/작성 §7 「결정 목록 통로」 · 도메인/인증 §7)

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { 권한이되나 } from '../auth/gate.js';
import { 누가 } from '../prd/routes.js';
import { 결정진행 } from './decisionRun.js';
import { 결정목록읽기, type 부른이 } from './decisions.js';
import { 서비스번호 } from './routes.js';

type 질의 = { Querystring: { service?: string } };

/** 그 애플리케이션(접두사)에서 부른 사람이 할 수 있는 것. 대시보드 「결정 필요」 수도 같은 것으로 센다 (도메인/리포팅 §8.12) */
export function 부른이로(req: FastifyRequest, prefix: string): 부른이 {
  const 사람 = req.user ?? { role: 'member' as const, services: [] };
  const 된다 = (기능: 'authoring' | 'runs', 칸: 'read' | 'write') => 권한이되나(사람, { 기능, 칸 }, [prefix]);
  return { admin: 사람.role === 'admin', 작성쓰기: 된다('authoring', 'write'), 실행읽기: 된다('runs', 'read'), 실행쓰기: 된다('runs', 'write') };
}

const 부른사람 = (req: FastifyRequest<질의>): 부른이 => 부른이로(req, req.query.service ?? '');

export default async function decisionRoutes(app: FastifyInstance): Promise<void> {
  app.get<질의>('/authoring/decisions', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    return 결정목록읽기(서비스, 부른사람(req));
  });

  app.post<질의 & { Body: unknown }>('/authoring/decisions/run', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const 결과 = await 결정진행(서비스, 부른사람(req), 누가(req), req.body);
    return reply.code(결과.code).send(결과.body);
  });
}

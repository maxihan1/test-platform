// 설정 API 중 프로젝트의 API 서버 이름 통로 둘 (SPEC 도메인/인증 §7 `…/api-servers`). routes.ts 가 300줄에 닿아 떼어 냈다
// 에러 처리기(설정오류 → 상태 코드)는 부른 쪽 플러그인 것을 그대로 쓴다

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 정수 } from '../routeParams.js';

import { API서버이름저장, API서버목록 } from './apiServers.js';

// 호스트는 서비스 지도(apiMap.ts API틀)가 소문자로 남기므로 같은 꼴로 받는다(포트까지). 공백 · 슬래시가 든 오타가 영구 줄로 남지 않게 모양을 본다. 빈 이름은 이름 지우기다
const 호스트모양 = /^[a-z0-9._:[\]-]+$/;
const API서버이름들 = z.object({
  items: z.array(z.object({ host: z.string().trim().toLowerCase().min(1).max(255).regex(호스트모양), name: z.string().trim().max(20) })).max(500),
});

export function API서버라우트(app: FastifyInstance): void {
  app.get<{ Params: { id: string } }>('/settings/projects/:id/api-servers', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    return { items: await API서버목록(id) };
  });

  app.put<{ Params: { id: string } }>('/settings/projects/:id/api-servers', async (req, reply) => {
    const parsed = API서버이름들.safeParse(req.body);
    const id = 정수(req.params.id);
    if (!parsed.success || id === null) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.success ? req.params.id : parsed.error.message });
    }
    await API서버이름저장(id, parsed.data.items);
    return { ok: true };
  });
}

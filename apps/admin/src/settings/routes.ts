// 설정 API (SPEC §7). 운영(admin) 등급만 닿는다 — 막는 것은 인증 미들웨어다 (auth/gate.ts).
// 화면은 WS-E 가 만든다 (§8.8). 여기는 API 까지다

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 에이전트토큰만들기, 에이전트토큰지우기 } from '../auth/agentToken.js';
import { 정수 } from '../routeParams.js';

import {
  계정고치기,
  계정만들기,
  계정목록,
  비밀번호다시만들기,
  서비스고치기,
  서비스만들기,
  서비스목록,
  설정오류,
} from './store.js';

// SPEC §2 의 접두사 모양을 코드가 복사해 둔 자리다. §2 를 고치면 여기도 같이 움직인다 (CLAUDE.md §2.7 ⑤).
// scripts/add-service.ts 가 이것을 가져다 쓴다 — 같은 모양을 두 번 적지 않는다
export const 접두사모양 = /^[A-Z][A-Z0-9]{0,11}$/;

// 테스트 계정은 역방향에서만 쓴다. 키가 없으면 기존 값을 유지하고 null·빈 글자면 지운다 (SPEC 도메인/인증 §7 「envs[] 한 줄」)
const 대상서버 = z.object({
  env: z.string().min(1),
  baseUrl: z.string().min(1),
  loginId: z.string().nullable().optional(),
  loginPassword: z.string().nullable().optional(),
});

const 새서비스 = z.object({
  prefix: z.string(),
  name: z.string().min(1),
  color: z.string().min(1),
  testsRepo: z.string(),
  testsDir: z.string().min(1),
  envs: z.array(대상서버).default([]),
  slackWebhook: z.string().optional(),
  figmaToken: z.string().optional(),
});

const 서비스수정 = z.object({
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  testsRepo: z.string().optional(),
  testsDir: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  envs: z.array(대상서버).optional(),
  slackWebhook: z.string().optional(),
  figmaToken: z.string().optional(),
});

const 등급 = z.enum(['viewer', 'operator', 'admin']);

const 새계정 = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  role: 등급,
  services: z.array(z.string()).default([]),
});

const 계정수정 = z.object({
  displayName: z.string().min(1).optional(),
  role: 등급.optional(),
  isActive: z.boolean().optional(),
  services: z.array(z.string()).optional(),
});

const 코드별상태: Record<string, number> = {
  PREFIX_TAKEN: 409,
  USERNAME_TAKEN: 409,
  LAST_ADMIN: 409,
  NOT_FOUND: 404,
};

export default async function settingsRoutes(app: FastifyInstance): Promise<void> {
  // 설정 API 는 실패가 전부 같은 모양이라 한자리에서 옮긴다
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof 설정오류) {
      return reply.code(코드별상태[err.code] ?? 400).send({ error: err.code });
    }
    throw err;
  });

  app.get('/settings/services', async () => ({ items: await 서비스목록() }));

  app.post('/settings/services', async (req, reply) => {
    const parsed = 새서비스.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }
    if (!접두사모양.test(parsed.data.prefix)) {
      return reply.code(400).send({ error: 'PREFIX_SHAPE', detail: parsed.data.prefix });
    }
    return reply.code(201).send({ id: await 서비스만들기(parsed.data) });
  });

  app.patch<{ Params: { id: string }; Body: { prefix?: unknown } }>(
    '/settings/services/:id',
    async (req, reply) => {
      // 접두사는 tcId 안에 이미 박혀 있다. 바꾸면 기존 케이스가 어느 서비스 것도 아니게 된다 (SPEC §8.8)
      if (req.body !== null && typeof req.body === 'object' && 'prefix' in req.body) {
        return reply.code(400).send({ error: 'PREFIX_IMMUTABLE' });
      }
      const parsed = 서비스수정.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
      }
      const id = 정수(req.params.id);
      if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
      await 서비스고치기(id, parsed.data);
      return { ok: true };
    },
  );

  app.get('/settings/users', async () => ({ items: await 계정목록() }));

  app.post('/settings/users', async (req, reply) => {
    const parsed = 새계정.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }
    // 이 응답이 비밀번호를 볼 수 있는 **유일한 자리**다. 다음부터는 다시 만들 수만 있다 (SPEC §8.8)
    const tempPassword = await 계정만들기(parsed.data);
    return reply.code(201).send({ username: parsed.data.username, tempPassword });
  });

  app.patch<{ Params: { username: string } }>('/settings/users/:username', async (req, reply) => {
    const parsed = 계정수정.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }
    await 계정고치기(req.params.username, parsed.data);
    return { ok: true };
  });

  app.post<{ Params: { username: string } }>('/settings/users/:username/password', async (req) => ({
    tempPassword: await 비밀번호다시만들기(req.params.username),
  }));

  // 비밀번호처럼 이 응답이 토큰을 볼 수 있는 유일한 자리다 (SPEC 도메인/인증 §7)
  app.post<{ Params: { username: string } }>('/settings/users/:username/agent-token', async (req, reply) => {
    const 결과 = await 에이전트토큰만들기(req.params.username);
    if (결과 === 'NOT_AUTHORING_AGENT') return reply.code(400).send({ error: 결과 });
    if (결과 === 'NOT_FOUND') return reply.code(404).send({ error: 결과 });
    return { agentToken: 결과.토큰 };
  });

  app.delete<{ Params: { username: string } }>('/settings/users/:username/agent-token', async (req, reply) => {
    await 에이전트토큰지우기(req.params.username);
    return reply.code(204).send();
  });
}

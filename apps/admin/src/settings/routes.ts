// 설정 API (SPEC §7). 운영(admin) 등급만 닿는다 — 막는 것은 인증 미들웨어다 (auth/gate.ts).
// 화면은 WS-E 가 만든다 (§8.8). 여기는 API 까지다

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 에이전트토큰만들기, 에이전트토큰지우기 } from '../auth/agentToken.js';
import { 아이디모양 } from '../auth/rules.js';
import { 시간대확인, 틀린시간대 } from '../reporting/dashboardResults.js';
import { 정수 } from '../routeParams.js';

import { 제외경로정리 } from './rules.js';
import { 대상서버키, 서비스고치기, 서비스만들기, 서비스목록, 설정오류 } from './store.js';
import { 계정거절, 계정고치기, 계정만들기, 계정목록, 계정수락, 비밀번호다시만들기 } from './users.js';

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

// 저장은 정리한 값이다. 틀린 줄은 다른 틀린 칸과 같은 400 INVALID_REQUEST 의 detail 로 돌려준다 (SPEC 도메인/인증 §7 계약 변경 블록)
const 훑지않을경로 = z.array(z.string()).transform((줄들, ctx) => {
  const 결과 = 제외경로정리(줄들);
  if ('값' in 결과) return 결과.값;
  ctx.addIssue({ code: 'custom', message: `crawlExclude ${결과.까닭}: ${결과.틀린줄}` });
  return z.NEVER;
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
  crawlExclude: 훑지않을경로.optional(),
});

// 시간대는 DB 이름표라 스키마 밖에서 본다 — 대시보드 tz 와 같은 검사다 (도메인/인증 §7 「정기 실행」 계약 변경 블록)
const 정기실행 = z.object({
  at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  tz: z.string().min(1),
  env: z.string().min(1),
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
  crawlExclude: 훑지않을경로.optional(),
  schedule: 정기실행.nullable().optional(),
});

const 등급 = z.enum(['member', 'admin']);
const 권한 = z.enum(['none', 'read', 'write']);
const 대시보드 = z.enum(['none', 'read']);

// 셋 다 none 인 줄은 받지 않는다 — 배정을 풀려면 줄을 뺀다 (SPEC 도메인/인증 §7 「services[] 한 줄」)
const 서비스줄 = z.object({
  prefix: z.string(),
  permissions: z
    .object({ cases: 권한, runs: 권한, authoring: 권한 })
    .refine((p) => p.cases !== 'none' || p.runs !== 'none' || p.authoring !== 'none'),
});
// 같은 접두사가 두 번이면 저장이 ON CONFLICT DO NOTHING 으로 뒤엣것을 조용히 버린다. 어느 쪽을 뜻했는지 모르니 받지 않는다
const 서비스줄들 = z.array(서비스줄).refine((줄들) => new Set(줄들.map((줄) => 줄.prefix)).size === 줄들.length);

const 새계정 = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  role: 등급,
  dashboard: 대시보드,
  services: 서비스줄들.default([]),
});

const 계정수정 = z.object({
  displayName: z.string().min(1).optional(),
  role: 등급.optional(),
  dashboard: 대시보드.optional(),
  isActive: z.boolean().optional(),
  services: 서비스줄들.optional(),
});

// 서비스 0개 수락도 받는다 — 들어와서 대시보드만 보는 사람이 있다 (계획 2026-09-28 게이트 1)
const 수락 = z.object({
  role: 등급.default('member'),
  dashboard: 대시보드,
  services: 서비스줄들,
});

// 권한 칸(services · dashboard)이 틀린 것은 화면이 따로 알려야 해서 코드를 가른다 (SPEC 도메인/인증 §7).
// 다른 칸도 같이 틀렸으면 권한만 고치라고 알리면 안 되니 전부 권한 칸일 때만이다
function 계정본문오류(error: z.ZodError): { error: string; detail?: string } {
  const 권한칸 = error.issues.every((i) => i.path[0] === 'services' || i.path[0] === 'dashboard');
  return 권한칸 ? { error: 'PERMISSIONS_SHAPE' } : { error: 'INVALID_REQUEST', detail: error.message };
}

const 코드별상태: Record<string, number> = {
  PREFIX_TAKEN: 409,
  USERNAME_TAKEN: 409,
  LAST_ADMIN: 409,
  ALREADY_APPROVED: 409,
  APPROVED_USER: 409,
  NOT_APPROVED: 409,
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
      const 틀린칸 = await 정기실행틀린칸(id, parsed.data);
      if (틀린칸 !== null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 틀린칸 });
      await 서비스고치기(id, parsed.data);
      return { ok: true };
    },
  );

  app.get('/settings/users', async () => ({ items: await 계정목록() }));

  app.post('/settings/users', async (req, reply) => {
    const parsed = 새계정.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(계정본문오류(parsed.error));
    // 가입과 같은 아이디 규칙이다 (SPEC 도메인/인증 §7 signup)
    if (!아이디모양.test(parsed.data.username)) return reply.code(400).send({ error: 'USERNAME_SHAPE' });
    // 이 응답이 비밀번호를 볼 수 있는 **유일한 자리**다. 다음부터는 다시 만들 수만 있다 (SPEC §8.8)
    const tempPassword = await 계정만들기(parsed.data);
    return reply.code(201).send({ username: parsed.data.username, tempPassword });
  });

  app.patch<{ Params: { username: string } }>('/settings/users/:username', async (req, reply) => {
    const parsed = 계정수정.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(계정본문오류(parsed.error));
    await 계정고치기(req.params.username, parsed.data);
    return { ok: true };
  });

  app.post<{ Params: { username: string } }>('/settings/users/:username/approve', async (req, reply) => {
    const parsed = 수락.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(계정본문오류(parsed.error));
    await 계정수락(req.params.username, parsed.data);
    return { ok: true };
  });

  app.delete<{ Params: { username: string } }>('/settings/users/:username', async (req, reply) => {
    await 계정거절(req.params.username);
    return reply.code(204).send();
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

/** 정기 실행에서 스키마가 못 보는 두 칸 — 시간대 이름표와 대상 서버. 같이 보낸 envs 가 있으면 그것으로 본다 */
async function 정기실행틀린칸(
  id: number,
  본문: { schedule?: { tz: string; env: string } | null; envs?: { env: string }[] },
): Promise<string | null> {
  const 정기 = 본문.schedule;
  if (정기 === undefined || 정기 === null) return null;
  try {
    const { pool } = await import('../db/index.js');
    await 시간대확인(pool, 정기.tz);
  } catch (err) {
    if (err instanceof 틀린시간대) return `schedule.tz: ${정기.tz}`;
    throw err;
  }
  const 키들 = 본문.envs?.map((e) => e.env) ?? (await 대상서버키(id));
  return 키들.includes(정기.env) ? null : `schedule.env: ${정기.env}`;
}

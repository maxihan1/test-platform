// 설정 API (SPEC §7). 운영(admin) 등급만 닿는다 — 막는 것은 인증 미들웨어다 (auth/gate.ts).
// 화면은 WS-E 가 만든다 (§8.8). 여기는 API 까지다

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 에이전트토큰만들기, 에이전트토큰지우기 } from '../auth/agentToken.js';
import { 아이디모양 } from '../auth/rules.js';
import { 코드저장소 } from '../bts/link.js';
import { 화면크기목록 } from '../prd/screens.js';
import { 정수 } from '../routeParams.js';

import { API서버라우트 } from './apiServerRoutes.js';
import { API칸, API칸오류, API칸지금 } from './apiService.js';
import { 게임패키지, 게임패키지거절, 대상서버목록, 역할틀림 } from './envBody.js';
import { 프로젝트만들기, 프로젝트목록, 프로젝트이름고치기 } from './projects.js';
import { 제외경로정리 } from './rules.js';
import { 정기실행틀린칸 } from './scheduleCheck.js';
import { 저장소주소맞추기 } from './testsRepo.js';
import { 서비스고치기, 서비스만들기, 서비스목록, 설정오류 } from './store.js';
import { 계정거절, 계정고치기, 계정만들기, 계정목록, 계정수락, 비밀번호다시만들기 } from './users.js';

// SPEC §2 의 접두사 모양을 코드가 복사해 둔 자리다. §2 를 고치면 여기도 같이 움직인다 (CLAUDE.md §2.7 ⑤).
// scripts/add-service.ts 가 이것을 가져다 쓴다 — 같은 모양을 두 번 적지 않는다
export const 접두사모양 = /^[A-Z][A-Z0-9]{0,11}$/;

// 저장은 정리한 값이다. 틀린 줄은 다른 틀린 칸과 같은 400 INVALID_REQUEST 의 detail 로 돌려준다 (SPEC 도메인/인증 §7 계약 변경 블록)
const 훑지않을경로 = z.array(z.string()).transform((줄들, ctx) => {
  const 결과 = 제외경로정리(줄들);
  if ('값' in 결과) return 결과.값;
  ctx.addIssue({ code: 'custom', message: `crawlExclude ${결과.까닭}: ${결과.틀린줄}` });
  return z.NEVER;
});

// 작성 에이전트가 이 저장소에 쓰고 서버가 받아 온다 — 한 꼴로 맞춰 저장한다. 빈 칸은 「아직 안 적음」이라 받는다 (공통/6-인프라 「테스트 코드 저장소」)
const 테스트저장소 = z.string().transform((주소, ctx) => {
  const 맞춘것 = 저장소주소맞추기(주소);
  if (맞춘것 !== null) return 맞춘것;
  ctx.addIssue({ code: 'custom', message: `testsRepo 는 https://github.com/<소유자>/<이름> 꼴이어야 한다: ${주소}` });
  return z.NEVER;
});

// 프로젝트 번호는 꼭 받는다. DB 트리거가 같은 이름 프로젝트를 붙이는 것은 fixture 와 add-service.ts 용 대체다 (도메인/인증 §7)
// 상한은 routeParams.ts 의 정수()와 같다 — 넘으면 Postgres 범위 초과가 잡히지 않은 500 이 된다
const 프로젝트번호 = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

const 프로젝트이름 = z.object({ name: z.string().trim().min(1) });

const 새서비스 = z.object({
  prefix: z.string(),
  name: z.string().min(1),
  color: z.string().min(1),
  projectId: 프로젝트번호,
  testsRepo: 테스트저장소,
  testsDir: z.string().min(1),
  envs: 대상서버목록.default([]),
  slackWebhook: z.string().optional(),
  figmaToken: z.string().optional(),
  crawlExclude: 훑지않을경로.optional(),
  kind: z.enum(['SCREEN', 'APP', 'GAME', 'API']).default('SCREEN'),
  ...API칸,
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
  projectId: 프로젝트번호.optional(),
  testsRepo: 테스트저장소.optional(),
  testsDir: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  envs: 대상서버목록.optional(),
  slackWebhook: z.string().optional(),
  figmaToken: z.string().optional(),
  crawlExclude: 훑지않을경로.optional(),
  schedule: 정기실행.nullable().optional(),
  codeRepos: z.array(코드저장소).max(10).optional(),
  ...API칸,
});

const 등급 = z.enum(['member', 'admin']);
const 권한 = z.enum(['none', 'read', 'write']);
// 실행 칸에만 trial(보기 + 테스트 모드)이 있다 (SPEC 도메인/인증 §3.5 「테스트 모드」)
const 실행권한 = z.enum(['none', 'read', 'trial', 'write']);
const 대시보드 = z.enum(['none', 'read']);

// 셋 다 none 인 줄은 받지 않는다 — 배정을 풀려면 줄을 뺀다 (SPEC 도메인/인증 §7 「projects[] 한 줄」)
const 프로젝트줄 = z.object({
  projectId: 프로젝트번호,
  permissions: z
    .object({ cases: 권한, runs: 실행권한, authoring: 권한 })
    .refine((p) => p.cases !== 'none' || p.runs !== 'none' || p.authoring !== 'none'),
});
// 같은 프로젝트가 두 번이면 저장이 ON CONFLICT DO NOTHING 으로 뒤엣것을 조용히 버린다. 어느 쪽을 뜻했는지 모르니 받지 않는다
const 프로젝트줄들 = z.array(프로젝트줄).refine((줄들) => new Set(줄들.map((줄) => 줄.projectId)).size === 줄들.length);

// 옛 services 를 보내면 조용히 무시되어 권한이 안 들어간 채 저장된 것처럼 보인다 — PERMISSIONS_SHAPE 400 으로 돌려준다 (PRJ-F1-02b)
const 옛배정 = { services: z.never().optional() };

const 새계정 = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  role: 등급,
  dashboard: 대시보드,
  ...옛배정,
  projects: 프로젝트줄들.default([]),
});

const 계정수정 = z.object({
  displayName: z.string().min(1).optional(),
  role: 등급.optional(),
  dashboard: 대시보드.optional(),
  isActive: z.boolean().optional(),
  ...옛배정,
  projects: 프로젝트줄들.optional(),
});

// 프로젝트 0개 수락도 받는다 — 들어와서 대시보드만 보는 사람이 있다 (계획 2026-09-28 게이트 1)
const 수락 = z.object({
  role: 등급.default('member'),
  dashboard: 대시보드,
  ...옛배정,
  projects: 프로젝트줄들,
});

// 권한 칸(projects · dashboard)이 틀린 것은 화면이 따로 알려야 해서 코드를 가른다 (SPEC 도메인/인증 §7).
// 다른 칸도 같이 틀렸으면 권한만 고치라고 알리면 안 되니 전부 권한 칸일 때만이다
function 계정본문오류(error: z.ZodError): { error: string; detail?: string } {
  const 권한칸 = error.issues.every((i) => i.path[0] === 'projects' || i.path[0] === 'services' || i.path[0] === 'dashboard');
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

  app.get('/settings/projects', async () => ({ items: await 프로젝트목록() }));

  app.post('/settings/projects', async (req, reply) => {
    const parsed = 프로젝트이름.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    return reply.code(201).send({ id: await 프로젝트만들기(parsed.data.name, req.user?.username) });
  });

  app.patch<{ Params: { id: string } }>('/settings/projects/:id', async (req, reply) => {
    const parsed = 프로젝트이름.safeParse(req.body);
    const id = 정수(req.params.id);
    if (!parsed.success || id === null) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.success ? req.params.id : parsed.error.message });
    }
    await 프로젝트이름고치기(id, parsed.data.name);
    return { ok: true };
  });

  API서버라우트(app);

  app.get('/settings/services', async () => ({ items: await 서비스목록() }));

  app.post('/settings/services', async (req, reply) => {
    const parsed = 새서비스.safeParse(req.body);
    if (!parsed.success) {
      if (parsed.error.issues.every((i) => i.path[0] === 'kind')) return reply.code(400).send({ error: 'BAD_KIND' });
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }
    if (!접두사모양.test(parsed.data.prefix)) {
      return reply.code(400).send({ error: 'PREFIX_SHAPE', detail: parsed.data.prefix });
    }
    if (역할틀림(parsed.data.envs)) return reply.code(400).send({ error: 'BAD_ROLE' });
    if (게임패키지(parsed.data.kind, parsed.data.envs)) return reply.code(400).send(게임패키지거절);
    const API오류 = API칸오류(parsed.data, { kind: parsed.data.kind, apiDocEnv: null, envs: [] });
    if (API오류 !== null) return reply.code(400).send({ error: API오류 });
    return reply.code(201).send({ id: await 서비스만들기(parsed.data) });
  });

  app.patch<{ Params: { id: string }; Body: { prefix?: unknown } }>(
    '/settings/services/:id',
    async (req, reply) => {
      // 접두사는 tcId 안에 이미 박혀 있다. 바꾸면 기존 케이스가 어느 서비스 것도 아니게 된다 (SPEC §8.8)
      if (req.body !== null && typeof req.body === 'object' && 'prefix' in req.body) {
        return reply.code(400).send({ error: 'PREFIX_IMMUTABLE' });
      }
      // 종류도 같은 까닭이다 — 바꾸면 이미 있는 케이스가 화면 케이스인지 API 케이스인지 섞인다 (도메인/API §3.8)
      if (req.body !== null && typeof req.body === 'object' && 'kind' in req.body) {
        return reply.code(400).send({ error: 'KIND_IMMUTABLE' });
      }
      const parsed = 서비스수정.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
      }
      if (역할틀림(parsed.data.envs)) return reply.code(400).send({ error: 'BAD_ROLE' });
      const id = 정수(req.params.id);
      if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
      const 틀린칸 = await 정기실행틀린칸(id, parsed.data);
      if (틀린칸 !== null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 틀린칸 });
      const 지금 = await API칸지금(id);
      if (지금 !== null && 게임패키지(지금.kind, parsed.data.envs)) return reply.code(400).send(게임패키지거절);
      const API오류 = 지금 === null ? null : API칸오류(parsed.data, 지금);
      if (API오류 !== null) return reply.code(400).send({ error: API오류 });
      await 서비스고치기(id, parsed.data);
      return { ok: true };
    },
  );

  // 화면 크기 판정의 화면별 차이 — 펼칠 때만 읽는다. 찾은 화면이 수천 장일 수 있어 서비스 목록에 안 싣는다 (PRD-F10-08)
  app.get<{ Params: { id: string }; Querystring: { env?: string } }>('/settings/services/:id/viewport', async (req, reply) => {
    const id = 정수(req.params.id);
    const env = req.query.env;
    if (id === null || env === undefined || env === '') return reply.code(400).send({ error: 'INVALID_REQUEST' });
    const 결과 = await 화면크기목록(id, env);
    return 결과 ?? reply.code(404).send({ error: 'NOT_FOUND' });
  });

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

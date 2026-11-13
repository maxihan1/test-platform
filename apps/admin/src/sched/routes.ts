// 정기 실행 세트 통로 — 목록 · 상세 · 만들기 · 고치기 · 켜고 끄기 · 달력 · 담을 후보 (도메인/정기실행 §7)
// 문(auth/gate.ts)은 「어딘가의 실행 칸」만 본다. 세트는 프로젝트에 속해서 그 프로젝트의 실행 칸은 여기서 본다 (인증 §7 정기 실행 두 줄)

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { 칸이되나 } from '../auth/permissions.js';
import { 시간대확인, 틀린시간대 } from '../reporting/dashboardResults.js';
import { MAX_ITEMS } from '../execution/store.js';
import { pool } from '../db/index.js';
import { 정수 } from '../routeParams.js';
import { type 재료, type 줄, 기준앱, 빠진셈, 저장문제, 줄앱, 줄이름 } from './check.js';
import { 지난결과들, 회차들, 후보들 } from './calendar.js';
import { type 세트, type 세트몸, 세트들읽기, 세트바꾸기, 세트쓰기, 재료읽기, 지났나 } from './store.js';

const 날짜 = z.string().refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), '날짜는 YYYY-MM-DD 입니다');
const 줄모양 = z.object({
  kind: z.enum(['FN', 'UI', 'E2E', 'COMPAT']),
  service: z.string().optional(),
  tcIds: z.array(z.string().min(1).max(100)).min(1).max(MAX_ITEMS).nullable().optional(),
  scenarioId: z.number().int().positive().optional(),
  compatSetId: z.number().int().positive().optional(),
});
const 고치기본문 = z.object({
  name: z.string().trim().min(1).max(100),
  at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '시각은 HH:MM 입니다'),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).nullable().optional(),
  onceOn: 날짜.nullable().optional(),
  items: z.array(줄모양).min(1, '담은 테스트가 없습니다').max(50),
  envs: z.array(z.object({ service: z.string(), env: z.string().min(1) })).max(50),
});
const 만들기본문 = 고치기본문.extend({ projectId: z.number().int().positive(), tz: z.string().min(1) });
const 바꾸기본문 = z.object({ isOn: z.boolean().optional(), isBase: z.boolean().optional() }).refine((b) => b.isOn !== undefined || b.isBase !== undefined, 'isOn · isBase 중 하나는 보냅니다');

const 잘못 = (reply: FastifyReply, detail: string) => reply.code(400).send({ error: 'INVALID_REQUEST', detail });
const 막힘 = (reply: FastifyReply) => reply.code(403).send({ error: 'FORBIDDEN' });
const 없음 = (reply: FastifyReply) => reply.code(404).send({ error: 'NOT_FOUND' });

/** 그 프로젝트의 실행 칸이 되나 — 권한은 프로젝트에 붙어 그 프로젝트 애플리케이션 줄마다 같은 값이다 (인증 §3.5) */
const 프로젝트칸 = (req: FastifyRequest, projectId: number, 필요: 'read' | 'write') =>
  req.user?.services.some((s) => s.projectId === projectId && 칸이되나(s.permissions.runs, 필요)) ?? false;

/** 세트줄 (§7) — 재료는 같은 프로젝트 세트들을 한 번에 읽은 것이다 */
function 세트줄(s: 세트, 재: 재료, 지난: Awaited<ReturnType<typeof 지난결과들>>, 기준있는앱: Map<number, number>) {
  const 앱이름 = (id: number) => 재.앱들.get(id)?.prefix ?? '';
  const 기준 = 기준앱(s.줄들, s.days);
  const 다른기준 = 기준 === null ? undefined : 기준있는앱.get(기준);
  return {
    id: s.id,
    name: s.name,
    at: s.at,
    tz: s.tz,
    days: s.days,
    onceOn: s.onceOn,
    isOn: s.isOn,
    isBase: s.isBase,
    items: s.줄들.map((x) => ({
      kind: x.kind,
      service: 줄앱(x, 재)?.prefix ?? 앱이름(x.serviceId),
      tcIds: x.tcIds,
      ...(x.scenarioId !== null && { scenarioId: x.scenarioId }),
      ...(x.compatSetId !== null && { compatSetId: x.compatSetId }),
      label: 줄이름(x, 재),
    })),
    envs: [...s.고름].map(([id, env]) => ({ service: 앱이름(id), env })),
    ...빠진셈(s.줄들, s.고름, 재),
    avgMinutes: 지난.get(s.id)?.avgMinutes ?? null,
    last: 지난.get(s.id)?.last ?? null,
    baseable: 기준 !== null && (다른기준 === undefined || 다른기준 === s.id),
  };
}

async function 세트줄들(projectId: number, 고를번호?: number) {
  const 세트들 = await 세트들읽기({ projectId });
  const [재, 지난] = await Promise.all([재료읽기(projectId, 세트들.flatMap((s) => s.줄들)), 지난결과들(세트들.map((s) => s.id))]);
  const 기준있는앱 = new Map(세트들.flatMap((s) => { const a = s.isBase ? 기준앱(s.줄들, s.days) : null; return a === null ? [] : [[a, s.id] as const]; }));
  return 세트들.filter((s) => 고를번호 === undefined || s.id === 고를번호).map((s) => 세트줄(s, 재, 지난, 기준있는앱));
}

type 본문 = z.infer<typeof 고치기본문>;

/** 본문 줄을 표 줄로 — E2E · 호환성은 시나리오 · 세트의 지금 애플리케이션을 적는다. 모르는 접두사 · 번호면 판정이 다른 프로젝트로 거절한다 */
function 본문줄들(b: 본문, 재: 재료): 줄[] | string {
  const 접두사 = new Map([...재.앱들.values()].map((a) => [a.prefix, a.id]));
  const 줄들: 줄[] = [];
  for (const [i, x] of b.items.entries()) {
    if (x.kind === 'E2E' && x.scenarioId === undefined) return `items.${i + 1}: scenarioId 가 필요합니다`;
    if (x.kind === 'COMPAT' && x.compatSetId === undefined) return `items.${i + 1}: compatSetId 가 필요합니다`;
    if ((x.kind === 'FN' || x.kind === 'UI') && x.service === undefined) return `items.${i + 1}: service 가 필요합니다`;
    const serviceId =
      x.kind === 'E2E' ? 재.시나리오.get(x.scenarioId!)?.serviceId : x.kind === 'COMPAT' ? 재.호환성.get(x.compatSetId!)?.serviceId : 접두사.get(x.service!);
    줄들.push({
      kind: x.kind,
      serviceId: serviceId ?? 0,
      tcIds: x.kind === 'FN' || x.kind === 'UI' ? (x.tcIds == null ? null : [...new Set(x.tcIds)]) : null,
      scenarioId: x.kind === 'E2E' ? x.scenarioId! : null,
      compatSetId: x.kind === 'COMPAT' ? x.compatSetId! : null,
    });
  }
  return 줄들;
}

/** 본문을 검사해 저장할 몸을 만든다. 틀리면 400 detail 글 */
async function 검사(b: 본문, projectId: number, tz: string, 옛: 세트 | null): Promise<세트몸 | string> {
  const days = b.days ?? null;
  const onceOn = b.onceOn ?? null;
  if ((days === null) === (onceOn === null)) return 'days · onceOn 중 하나만 보냅니다';
  if (onceOn !== null && (await 지났나(onceOn, b.at, tz))) return 'PAST_ONCE';
  // 줄이 가리키는 번호를 먼저 읽어야 E2E · 호환성의 애플리케이션을 안다 — 애플리케이션 칸은 판정 재료를 읽은 뒤 채운다
  const 미리 = b.items.map((x): 줄 => ({ kind: x.kind, serviceId: 0, tcIds: x.tcIds ?? null, scenarioId: x.scenarioId ?? null, compatSetId: x.compatSetId ?? null }));
  const 재 = await 재료읽기(projectId, [...미리, ...(옛?.줄들 ?? [])]);
  const 줄들 = 본문줄들(b, 재);
  if (typeof 줄들 === 'string') return 줄들;
  const 접두사 = new Map([...재.앱들.values()].map((a) => [a.prefix, a.id]));
  const 고름 = new Map(b.envs.flatMap((e) => { const id = 접두사.get(e.service); return id === undefined ? [] : [[id, e.env] as const]; }));
  // 실행을 만드는 애플리케이션 것만 남긴다 — 줄을 뺀 뒤 남은 서버 고름은 화면이 안 지워도 된다
  const 쓰는 = new Set(줄들.flatMap((x) => { const a = 줄앱(x, 재); return a === undefined ? [] : [a.id]; }));
  for (const id of 고름.keys()) if (!쓰는.has(id)) 고름.delete(id);
  const 문제 = 저장문제(줄들, 고름, 옛 === null ? null : { 줄들: 옛.줄들, 고름: 옛.고름 }, 재);
  if (문제 !== null) return 문제;
  if (옛?.isBase === true && 기준앱(줄들, days) !== 기준앱(옛.줄들, 옛.days)) return 'BASE_SET_SHAPE';
  return { name: b.name, at: b.at, days: days === null ? null : [...new Set(days)].sort((x, y) => x - y), onceOn, 줄들, 고름 };
}

async function 세트하나(id: number): Promise<세트 | null> {
  return (await 세트들읽기({ id }))[0] ?? null;
}

export default async function schedRoutes(app: FastifyInstance): Promise<void> {
  const 프로젝트번호 = (raw: unknown) => (typeof raw === 'string' ? 정수(raw) : null);

  app.get<{ Querystring: { projectId?: unknown } }>('/sched/sets', async (req, reply) => {
    const projectId = 프로젝트번호(req.query.projectId);
    if (projectId === null) return 잘못(reply, 'projectId 가 필요합니다');
    if (!프로젝트칸(req, projectId, 'read')) return 막힘(reply);
    return { items: await 세트줄들(projectId) };
  });

  app.get<{ Params: { id: string } }>('/sched/sets/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    const s = id === null ? null : await 세트하나(id);
    if (s === null) return 없음(reply);
    if (!프로젝트칸(req, s.projectId, 'read')) return 막힘(reply);
    return (await 세트줄들(s.projectId, s.id))[0];
  });

  app.post('/sched/sets', async (req, reply) => {
    const parsed = 만들기본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.issues.map((i) => i.message).join(' · '));
    const b = parsed.data;
    if (!프로젝트칸(req, b.projectId, 'write')) return 막힘(reply);
    try {
      await 시간대확인(pool, b.tz);
    } catch (err) {
      if (err instanceof 틀린시간대) return 잘못(reply, `tz: ${b.tz}`);
      throw err;
    }
    const 몸 = await 검사(b, b.projectId, b.tz, null);
    if (typeof 몸 === 'string') return 잘못(reply, 몸);
    const id = await 세트쓰기({ projectId: b.projectId, tz: b.tz }, 몸, req.user?.username ?? '알 수 없음');
    return id === 'NAME_TAKEN' ? 잘못(reply, id) : reply.code(201).send({ id });
  });

  app.put<{ Params: { id: string } }>('/sched/sets/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    const 옛 = id === null ? null : await 세트하나(id);
    if (옛 === null) return 없음(reply);
    if (!프로젝트칸(req, 옛.projectId, 'write')) return 막힘(reply);
    const parsed = 고치기본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.issues.map((i) => i.message).join(' · '));
    const 몸 = await 검사(parsed.data, 옛.projectId, 옛.tz, 옛);
    if (typeof 몸 === 'string') return 잘못(reply, 몸);
    const 결과 = await 세트쓰기({ id: 옛.id }, 몸, req.user?.username ?? '알 수 없음');
    return 결과 === 'NAME_TAKEN' ? 잘못(reply, 결과) : { id: 옛.id };
  });

  app.patch<{ Params: { id: string } }>('/sched/sets/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    const s = id === null ? null : await 세트하나(id);
    if (s === null) return 없음(reply);
    if (!프로젝트칸(req, s.projectId, 'write')) return 막힘(reply);
    const parsed = 바꾸기본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.issues.map((i) => i.message).join(' · '));
    if (parsed.data.isBase === true && !s.isBase) {
      // 꼴이 맞고 그 애플리케이션에 다른 기준 세트가 없어야 한다 (§3.16 「기준 정하기 · 풀기」)
      // ponytail: 두 사람이 같은 애플리케이션의 다른 세트를 동시에 기준으로 정하면 둘 다 들어갈 수 있다 — 막아야 하면 애플리케이션 줄을 잠근다
      const 앱 = 기준앱(s.줄들, s.days);
      const 다른 = 앱 === null ? [] : (await 세트들읽기({ projectId: s.projectId })).filter((x) => x.isBase && x.id !== s.id && 기준앱(x.줄들, x.days) === 앱);
      if (앱 === null || 다른.length > 0) return 잘못(reply, 'BASE_SET_SHAPE');
    }
    await 세트바꾸기(s.id, parsed.data, req.user?.username ?? '알 수 없음');
    return { id: s.id };
  });

  app.get<{ Querystring: { projectId?: unknown; from?: unknown; to?: unknown } }>('/sched/calendar', async (req, reply) => {
    const projectId = 프로젝트번호(req.query.projectId);
    const from = 날짜.safeParse(req.query.from);
    const to = 날짜.safeParse(req.query.to);
    if (projectId === null || !from.success || !to.success) return 잘못(reply, 'projectId · from · to 가 필요합니다');
    const 일수 = (Date.parse(to.data) - Date.parse(from.data)) / 86_400_000;
    if (일수 < 0 || 일수 > 61) return 잘못(reply, '기간은 62일까지입니다');
    if (!프로젝트칸(req, projectId, 'read')) return 막힘(reply);
    return { occurrences: await 회차들(projectId, from.data, to.data) };
  });

  app.get<{ Querystring: { projectId?: unknown } }>('/sched/candidates', async (req, reply) => {
    const projectId = 프로젝트번호(req.query.projectId);
    if (projectId === null) return 잘못(reply, 'projectId 가 필요합니다');
    if (!프로젝트칸(req, projectId, 'read')) return 막힘(reply);
    return 후보들(projectId);
  });
}

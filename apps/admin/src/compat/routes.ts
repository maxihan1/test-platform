// 호환성 세트 · 디바이스 통로 — 목록 · 상세 · 미리 셈 · 만들기 · 고치기 · 치우기 · 팜 디바이스 목록 (도메인/호환성 §7)
// 배정과 권한은 문(auth/gate.ts)이 이미 봤다. 여기서는 애플리케이션이 실재하는가와 세트 규칙만 본다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { 정수 } from '../routeParams.js';
import { 시리얼 } from '../perf/devices.js';
import { 호환성디바이스목록 } from './devices.js';
import { 세트최근실행 } from './runRead.js';
import { 호환성요약들 } from './runView.js';
import { type 고른것, 셈하기, 예상하기, 자동선택 } from './select.js';
import { type 세트, type 세트디바이스, 세트고치기, 세트만들기, 세트목록, 세트치우기, 세트하나, 재료읽기, 최근소요, type 재료 } from './store.js';

const 케이스번호 = z.string().min(1).max(100);
const 세트본문 = z.object({
  serviceId: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  onePerModel: z.boolean(),
  devices: z.array(z.object({ serial: z.string().regex(시리얼) })).max(50),
  addedCases: z.array(케이스번호).max(200),
});
const 미리셈본문 = z.object({ serviceId: z.number().int().positive(), addedCases: z.array(케이스번호).max(200) });

const 잘못 = (reply: FastifyReply, detail: string) => reply.code(400).send({ error: 'INVALID_REQUEST', detail });
const 세트없음 = (reply: FastifyReply) => reply.code(404).send({ error: 'COMPAT_SET_NOT_FOUND' });

async function 애플리케이션(serviceId: number): Promise<{ id: number; prefix: string } | null> {
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ prefix: string }>('SELECT prefix FROM service WHERE id = $1 AND is_active', [serviceId]);
  return r.rows[0] === undefined ? null : { id: serviceId, prefix: r.rows[0].prefix };
}

/**
 * 직접 추가에 고를 수 없는 케이스(없는 · 다른 애플리케이션 · 폰에서 안 도는 · 지운 케이스)가 있으면 그 번호들.
 * 이미 세트에 있던 것은 묻지 않는다 — 저장한 뒤 지워진 케이스 하나로 세트를 못 고치게 되면 안 된다(셈에서는 빠지고 실행 때 건너뛴다)
 */
const 모르는케이스 = (재: 재료, 더한: readonly string[], 있던: readonly string[] = []) => {
  const 있음 = new Set([...재.후보들.map((c) => c.tcId), ...있던]);
  return [...new Set(더한)].filter((t) => !있음.has(t));
};

const 셈 = (재: 재료, 더한: readonly string[], auto?: 고른것[]) => 셈하기(재.전체, 재.후보들, 더한, 재.fallback, auto);

type 최근 = { runId: number; startedAt: string; state: string; confirmed: number; pending: number; unchecked: number } | null;

const 목록줄 = (s: 세트, coverage: ReturnType<typeof 셈>['coverage'], lastRun: 최근) => ({
  id: s.id,
  name: s.name,
  onePerModel: s.onePerModel,
  devices: s.devices,
  addedCases: s.addedCases,
  coverage,
  lastRun,
});

/** 세트마다 가장 최근 실행의 요약 — 세트 목록 「최근 실행」 칸의 알약이다 (§8.17 ①) */
async function 최근실행들(setIds: readonly number[]): Promise<Map<number, NonNullable<최근>>> {
  const 번호 = await 세트최근실행(setIds);
  const 요약 = await 호환성요약들([...번호.values()]);
  return new Map([...번호].flatMap(([setId, runId]) => {
    const x = 요약.get(runId);
    return x === undefined ? [] : [[setId, { runId, startedAt: x.started, state: x.status, confirmed: x.confirmed, pending: x.pending, unchecked: x.unchecked }] as const];
  }));
}

type 디바이스결과 = { devices: 세트디바이스[] } | { status: 400 | 502; body: object };

/**
 * 모델 · 기종명 사본은 팜 목록에서 채운다. 팜에 없는 디바이스는 이미 세트에 있던 것이면 옛 사본을 두고(등록에서 빠진 폰도 세트는 읽힌다),
 * 새로 넣는 것이면 거절한다 — 팜이 답하지 않으면 확인할 길이 없어 502 다
 */
async function 디바이스채우기(요청: readonly { serial: string }[], 옛: readonly 세트디바이스[]): Promise<디바이스결과> {
  if (요청.length === 0) return { status: 400, body: { error: 'NO_DEVICE' } };
  const serials = 요청.map((d) => d.serial);
  if (new Set(serials).size !== serials.length) return { status: 400, body: { error: 'INVALID_REQUEST', detail: '디바이스가 겹칩니다' } };
  const 옛사본 = new Map(옛.map((d) => [d.serial, d]));
  const 팜 = await 호환성디바이스목록();
  if (팜 === null && !serials.every((s) => 옛사본.has(s))) return { status: 502, body: { error: 'FARM_UNREACHABLE' } };
  const 팜사본 = new Map((팜 ?? []).map((d) => [d.serial, { serial: d.serial, model: d.model, name: d.marketName ?? d.model }]));
  const 모름 = serials.filter((s) => !팜사본.has(s) && !옛사본.has(s));
  if (모름.length > 0) return { status: 400, body: { error: 'UNKNOWN_DEVICE', serials: 모름 } };
  return { devices: serials.map((s) => 팜사본.get(s) ?? 옛사본.get(s)!) };
}

export default async function compatRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { serviceId?: string } }>('/compat-sets', async (req, reply) => {
    const serviceId = 정수(req.query.serviceId ?? '');
    if (serviceId === null) return 잘못(reply, 'serviceId 가 필요합니다');
    const 앱 = await 애플리케이션(serviceId);
    if (앱 === null) return 잘못(reply, `모르는 애플리케이션입니다: ${serviceId}`);
    const [재, 세트들] = await Promise.all([재료읽기(앱.id, 앱.prefix), 세트목록(앱.id)]);
    const auto = 자동선택(재.전체, 재.후보들);
    const 최근 = await 최근실행들(세트들.map((s) => s.id));
    return { sets: 세트들.map((s) => 목록줄(s, 셈(재, s.addedCases, auto).coverage, 최근.get(s.id) ?? null)) };
  });

  app.post('/compat-sets/preview', async (req, reply) => {
    const parsed = 미리셈본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.message);
    const 앱 = await 애플리케이션(parsed.data.serviceId);
    if (앱 === null) return 잘못(reply, `모르는 애플리케이션입니다: ${parsed.data.serviceId}`);
    const 재 = await 재료읽기(앱.id, 앱.prefix);
    const 모름 = 모르는케이스(재, parsed.data.addedCases);
    if (모름.length > 0) return reply.code(400).send({ error: 'UNKNOWN_CASE', tcIds: 모름 });
    return 셈(재, parsed.data.addedCases);
  });

  app.get<{ Params: { id: string } }>('/compat-sets/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    const s = id === null ? null : await 세트하나(id);
    if (s === null || !s.isActive) return 세트없음(reply);
    const 앱 = await 애플리케이션(s.serviceId);
    if (앱 === null) return 세트없음(reply);
    const 재 = await 재료읽기(앱.id, 앱.prefix);
    const 결과 = 셈(재, s.addedCases);
    // 직접 추가가 자동 선택에도 들면 한 번만 돈다 — 자동 선택 쪽으로 센다
    const 후보 = new Map(재.후보들.map((c) => [c.tcId, c]));
    const 돌것 = [...new Set([...결과.auto.map((a) => a.tcId), ...s.addedCases])].flatMap((t) => { const c = 후보.get(t); return c === undefined ? [] : [c]; });
    const 소요 = await 최근소요(돌것.map((c) => c.tcId));
    return {
      ...목록줄(s, 결과.coverage, (await 최근실행들([s.id])).get(s.id) ?? null),
      auto: 결과.auto,
      uncovered: 결과.uncovered,
      // 원격 접기가 없어 폴더블도 상태 하나다 — 점검 상태 수 = 디바이스 수 (§3.13 「비전에 기대는 것」 3)
      estimate: 예상하기(돌것.map((c) => ({ 화면수: c.화면수, 평균ms: 소요.get(c.tcId) ?? null })), s.devices.length),
    };
  });

  async function 저장(req: FastifyRequest, reply: FastifyReply, 옛: 세트 | null) {
    const parsed = 세트본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.message);
    const b = parsed.data;
    if (옛 !== null && b.serviceId !== 옛.serviceId) return 잘못(reply, '세트의 애플리케이션은 바꿀 수 없습니다');
    const 앱 = await 애플리케이션(b.serviceId);
    if (앱 === null) return 잘못(reply, `모르는 애플리케이션입니다: ${b.serviceId}`);
    const 모름 = 모르는케이스(await 재료읽기(앱.id, 앱.prefix), b.addedCases, 옛?.addedCases);
    if (모름.length > 0) return reply.code(400).send({ error: 'UNKNOWN_CASE', tcIds: 모름 });
    const 디 = await 디바이스채우기(b.devices, 옛?.devices ?? []);
    if ('status' in 디) return reply.code(디.status).send(디.body);
    // 모델이 단위다 — 「모델별 1대」를 켠 세트에 같은 모델이 둘이면 같은 모델을 두 번 돈다 (§3.13 「호환성 세트」 · §8.17)
    if (b.onePerModel && new Set(디.devices.map((d) => d.model)).size !== 디.devices.length) return 잘못(reply, '모델별 1대를 켠 세트는 같은 모델을 한 대만 고릅니다');
    const 몸 = { name: b.name, onePerModel: b.onePerModel, devices: 디.devices, addedCases: [...new Set(b.addedCases)] };
    if (옛 === null) return reply.code(201).send({ id: await 세트만들기(앱.id, 몸, req.user?.username ?? '알 수 없음') });
    return (await 세트고치기(옛.id, 몸)) ? { id: 옛.id } : 세트없음(reply);
  }

  app.post('/compat-sets', async (req, reply) => 저장(req, reply, null));

  app.put<{ Params: { id: string } }>('/compat-sets/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    const s = id === null ? null : await 세트하나(id);
    if (s === null || !s.isActive) return 세트없음(reply);
    return 저장(req, reply, s);
  });

  app.delete<{ Params: { id: string } }>('/compat-sets/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null || !(await 세트치우기(id))) return 세트없음(reply);
    return reply.code(204).send();
  });

  app.get('/compat-devices', async (_req, reply) => {
    const devices = await 호환성디바이스목록();
    if (devices === null) return reply.code(502).send({ error: 'FARM_UNREACHABLE' });
    return { devices };
  });
}

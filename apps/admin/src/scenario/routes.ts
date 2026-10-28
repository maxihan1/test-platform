// 시나리오 컨텍스트의 HTTP 라우트 — 저장·버전·되돌리기·치우기·케이스 부품 재료 (SPEC 도메인/시나리오 §7)
// 배정과 권한은 문(auth/gate.ts)이 이미 봤다. 여기서는 서비스가 실재하는가와 조립 규칙만 본다

import type { Platform, ScenarioPart } from '@platform/kit';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { 칸되는서비스 } from '../auth/permissions.js';
import { findService } from '../catalog/store.js';
import { 정수 } from '../routeParams.js';

import { 같은프로젝트접두사, 앱종류읽기 } from './apps.js';
import { 점검 } from './checks.js';
import { 흐름결과읽기, 흐름맡기기 } from './flowJob.js';
import { 값연결제안들, 제안재료읽기 } from './linkSuggest.js';
import { 다음케이스읽기, 첫케이스읽기 } from './next.js';
import { 케이스재료 } from './parts.js';
import { 고치기, 되돌리기, 만들기, 목록, 상세, 옛버전, 치우기, type 저장하는사람 } from './store.js';
import { 부품들모양, 제한시간크기사유, 조립검사 } from './validate.js';

const 이름 = z.string().trim().min(1).max(100);
// android 는 Android 앱 · 게임 애플리케이션의 시나리오다 (§3.7 결정 16)
const 디바이스 = z.enum(['desktop', 'mobile', 'android']);
// 문이 본문 service 를 접두사 모양으로 이미 봤다. 여기서는 바꾸지 않고 그대로 쓴다
const 만들기본문 = z.object({ service: z.string(), name: 이름, platform: 디바이스, parts: 부품들모양 });
const 고치기본문 = z.object({ name: 이름, platform: 디바이스, parts: 부품들모양, baseVersion: z.number().int().min(1) });
const 되돌리기본문 = z.object({ version: z.number().int().min(1) });
const 제안본문 = z.object({ service: z.string(), parts: 부품들모양 });
const 흐름본문 = z.object({ service: z.string(), platform: 디바이스, wish: z.string().trim().max(200).optional() });

const 케이스번호들 = (parts: ScenarioPart[]) => parts.flatMap((p) => (p.kind === 'case' ? [p.tcId] : []));

function 누가(req: FastifyRequest): 저장하는사람 {
  return { username: req.user?.username ?? '알 수 없음', displayName: req.user?.displayName ?? '알 수 없음' };
}

const 잘못 = (reply: FastifyReply, detail: string) => reply.code(400).send({ error: 'INVALID_REQUEST', detail });
const 없음 = (reply: FastifyReply, detail: string) => reply.code(404).send({ error: 'SCENARIO_NOT_FOUND', detail });

// 치운 것은 보기만, 비활성 서비스의 것은 만들기와 같게 400 이다 (게이트 0 승인 3). 거절이면 보낸 응답을 돌려준다
// 치운 것 검사는 빠른 거절일 뿐이다 — 이 검사와 저장 사이에 치우기가 낄 수 있어 진짜 그물은 store 의 잠금 안 판정이다
const 치웠음 = (reply: FastifyReply, id: number) =>
  reply.code(409).send({ error: 'SCENARIO_ARCHIVED', detail: `치운 시나리오다: ${id}` });
async function 고칠수없음(reply: FastifyReply, 지금: { id: number; isActive: boolean; service: string }) {
  if (!지금.isActive) return 치웠음(reply, 지금.id);
  if ((await findService(지금.service)) === null) return 잘못(reply, `모르는 서비스다: ${지금.service}`);
  return null;
}

// 만들기·고치기는 조립 규칙을 전부 건다. 되돌리기는 안 건다 — 옛 조합의 복사본이라 막으면 영영 못 되돌린다
async function 조립오류(parts: ScenarioPart[], platform: Platform, service: string): Promise<string[]> {
  // 시작 애플리케이션과 같은 프로젝트의 애플리케이션 케이스를 섞을 수 있다 (§3.7 결정 13)
  const 허용 = await 같은프로젝트접두사(service);
  const { 카탈로그 } = await 케이스재료(케이스번호들(parts), 허용);
  return 조립검사(parts, platform, service, 카탈로그, 허용, await 앱종류읽기(허용));
}

export default async function scenarioRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { service?: string; uses?: string | string[] } }>('/scenarios', async (req, reply) => {
    const prefix = req.query.service ?? '';
    if (prefix === '') return reply.code(400).send({ error: 'SERVICE_REQUIRED' });
    const 서비스 = await findService(prefix);
    if (서비스 === null) return 잘못(reply, `모르는 서비스다: ${prefix}`);

    const 전부 = await 목록(서비스.id);
    // 케이스 삭제 요청 화면이 그 케이스를 쓰는 시나리오만 받으려는 거름. 목록은 최신 버전 부품만 들고 있다
    // ?uses= 를 두 번 붙이면 Fastify 가 배열로 준다 — 쉼표로 이은 것과 같은 뜻으로 받는다
    const 쓰는것 = new Set([req.query.uses ?? ''].flat().join(',').split(',').map((t) => t.trim()).filter((t) => t !== ''));
    const 줄들 = 쓰는것.size === 0 ? 전부 : 전부.filter((s) => s.parts.some((p) => p.kind === 'case' && 쓰는것.has(p.tcId)));
    // 한 요청 안에서 케이스마다 한 번만 읽는다. 시나리오들이 같은 케이스를 여러 번 쓴다
    const { 카탈로그 } = await 케이스재료(줄들.flatMap((s) => 케이스번호들(s.parts)), await 같은프로젝트접두사(prefix));
    return {
      items: 줄들.map(({ parts, lastRun, ...줄 }) => {
        const { needsCheck, runnable } = 점검(parts, 카탈로그);
        return { ...줄, needsCheck, runnable, lastRun };
      }),
    };
  });

  app.post('/scenarios', async (req, reply) => {
    const parsed = 만들기본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.message);
    const { service, name, platform, parts } = parsed.data;
    const 서비스 = await findService(service);
    if (서비스 === null) return 잘못(reply, `모르는 서비스다: ${service}`);

    const 오류 = await 조립오류(parts, platform, service);
    if (오류.length > 0) return 잘못(reply, 오류.join(' · '));
    return reply.code(201).send(await 만들기(서비스.id, name, platform, parts, 누가(req)));
  });

  // `:id` 보다 먼저 적는다. 구간 수가 달라 겹치지는 않지만 읽는 사람이 헷갈리지 않게
  app.get<{ Params: { tcId: string } }>('/scenarios/case-parts/:tcId', async (req, reply) => {
    const { 부품재료 } = await 케이스재료([req.params.tcId]);
    const 재료 = 부품재료.get(req.params.tcId);
    if (재료 === undefined) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: req.params.tcId });
    return 재료;
  });

  // 다음 단계 추천 · 첫 단계 후보. 정상 쪽 거르기 · 디바이스는 화면이 팔레트 목록으로 한다 (§8.11)
  app.get<{ Querystring: { service?: string; after?: unknown } }>('/scenarios/next-cases', async (req, reply) => {
    const prefix = req.query.service ?? '';
    if (prefix === '') return reply.code(400).send({ error: 'SERVICE_REQUIRED' });
    const 서비스 = await findService(prefix);
    if (서비스 === null) return 잘못(reply, `모르는 서비스다: ${prefix}`);
    // after 칸이 아예 없으면 첫 단계 후보다 (결정 15). ?after= 를 두 번 붙이면 배열이 온다 — 어느 단계 뒤인지 모르니 추천하지 않는다
    if (req.query.after === undefined) return { items: await 첫케이스읽기(서비스.id, prefix) };
    const after = typeof req.query.after === 'string' ? req.query.after : '';
    return { items: await 다음케이스읽기(서비스.id, prefix, after) };
  });

  // 값 연결 제안. 저장 안 한 초안이라 조립 거절은 안 건다. 지도는 작성 칸이라 (작성, read) 가 있는 애플리케이션 단계만 본다 (결정 15)
  // 60분 · 크기 상한만은 먼저 본다 — 제안은 단계 수의 제곱으로 돌고, 크기 안에도 단계가 수천 개 든다. 60분 상한이 케이스 단계 수를 묶는다. 넘는 초안은 어차피 저장이 안 돼 빈 목록이다
  app.post('/scenarios/link-suggestions', async (req, reply) => {
    const parsed = 제안본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.message);
    const { service, parts } = parsed.data;
    if ((await findService(service)) === null) return 잘못(reply, `모르는 서비스다: ${service}`);
    if (제한시간크기사유(parts).length > 0) return { items: [] };
    const 읽는앱 = new Set(칸되는서비스(req.user?.services ?? [], 'authoring', 'read'));
    const 앱들 = (await 같은프로젝트접두사(service)).filter((p) => 읽는앱.has(p) && 케이스번호들(parts).some((t) => t.startsWith(`${p}-`)));
    const { 지도, 입력칸 } = await 제안재료읽기(앱들, 케이스번호들(parts));
    return { items: 값연결제안들(parts, 지도, 입력칸) };
  });

  // AI 흐름 후보 맡기기 · 결과 보기 (결정 15). 일은 성능 AI 일 표 · 집기를 같이 쓴다 — 권한은 시나리오 쪽 칸으로 본다
  app.post('/scenarios/flow-suggestions', async (req, reply) => {
    const parsed = 흐름본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.message);
    const { service, platform } = parsed.data;
    const 서비스 = await findService(service);
    if (서비스 === null) return 잘못(reply, `모르는 서비스다: ${service}`);
    // 조립 검사와 같은 규칙 — 저장하면 거절될 디바이스로 AI 일을 쓰지 않는다 (결정 16)
    if ((platform === 'android') !== (await 앱종류읽기([service])).has(service)) {
      return 잘못(reply, platform === 'android' ? `${service} 는 Android 앱 · 게임 애플리케이션이 아니라 android 를 고를 수 없다` : `${service} 는 Android 앱 · 게임 애플리케이션이라 디바이스는 android 만 고른다`);
    }
    const wish = parsed.data.wish === undefined || parsed.data.wish === '' ? null : parsed.data.wish;
    const r = await 흐름맡기기({ id: 서비스.id, prefix: service }, platform, wish, req.user?.username ?? '');
    if ('jobId' in r) return reply.code(202).send(r);
    return r.error === 'AGENT_OFFLINE'
      ? reply.code(503).send({ error: 'AGENT_OFFLINE', detail: '작성 에이전트가 꺼져 있습니다' })
      : reply.code(409).send({ error: 'NO_DATA', detail: '그 디바이스에서 도는 활성 기능 테스트가 둘보다 적습니다' });
  });

  app.get<{ Params: { jobId: string } }>('/scenarios/flow-suggestions/:jobId', async (req, reply) => {
    const id = 정수(req.params.jobId);
    if (id === null) return 잘못(reply, req.params.jobId);
    const 지도읽는앱 = new Set(칸되는서비스(req.user?.services ?? [], 'authoring', 'read'));
    const 결과 = await 흐름결과읽기(id, (prefix) => 지도읽는앱.has(prefix));
    if (결과 === null) return reply.code(404).send({ error: 'NOT_FOUND', detail: req.params.jobId });
    return 결과;
  });

  app.get<{ Params: { id: string } }>('/scenarios/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, req.params.id);
    const 본것 = await 상세(id);
    if (본것 === null) return 없음(reply, req.params.id);
    const { 카탈로그 } = await 케이스재료(케이스번호들(본것.parts), await 같은프로젝트접두사(본것.service));
    return { ...본것, checks: 점검(본것.parts, 카탈로그).checks };
  });

  app.get<{ Params: { id: string; v: string } }>('/scenarios/:id/versions/:v', async (req, reply) => {
    const id = 정수(req.params.id);
    const v = 정수(req.params.v);
    if (id === null || v === null) return 잘못(reply, `${req.params.id}/${req.params.v}`);
    const 옛것 = await 옛버전(id, v);
    if (옛것 === null) return 없음(reply, `${req.params.id}/${req.params.v}`);
    return 옛것;
  });

  app.put<{ Params: { id: string } }>('/scenarios/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, req.params.id);
    const parsed = 고치기본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.message);
    const 지금 = await 상세(id);
    if (지금 === null) return 없음(reply, req.params.id);
    const 거절 = await 고칠수없음(reply, 지금);
    if (거절 !== null) return 거절;

    const 오류 = await 조립오류(parsed.data.parts, parsed.data.platform, 지금.service);
    if (오류.length > 0) return 잘못(reply, 오류.join(' · '));
    const 결과 = await 고치기(id, parsed.data, 누가(req));
    if (결과 === null) return 없음(reply, req.params.id);
    if ('error' in 결과) return 결과.error === 'SCENARIO_ARCHIVED' ? 치웠음(reply, id) : reply.code(409).send(결과);
    return 결과;
  });

  app.post<{ Params: { id: string } }>('/scenarios/:id/restore', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, req.params.id);
    const parsed = 되돌리기본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.message);
    const 지금 = await 상세(id);
    if (지금 === null) return 없음(reply, req.params.id);
    const 거절 = await 고칠수없음(reply, 지금);
    if (거절 !== null) return 거절;
    const 결과 = await 되돌리기(id, parsed.data.version, 누가(req));
    if (결과 === null) return 없음(reply, `${req.params.id}/${parsed.data.version}`);
    if ('error' in 결과) return 치웠음(reply, id);
    return 결과;
  });

  app.post<{ Params: { id: string } }>('/scenarios/:id/archive', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, req.params.id);
    if (!(await 치우기(id))) return 없음(reply, req.params.id);
    return reply.code(204).send();
  });
}

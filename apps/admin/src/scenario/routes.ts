// 시나리오 컨텍스트의 HTTP 라우트 — 저장·버전·되돌리기·치우기·케이스 부품 재료 (SPEC 도메인/시나리오 §7)
// 배정과 권한은 문(auth/gate.ts)이 이미 봤다. 여기서는 서비스가 실재하는가와 조립 규칙만 본다

import type { ScenarioPart } from '@platform/kit';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { findService } from '../catalog/store.js';
import { 정수 } from '../routeParams.js';

import { 점검 } from './checks.js';
import { 케이스재료 } from './parts.js';
import { 고치기, 되돌리기, 만들기, 목록, 상세, 옛버전, 치우기, type 저장하는사람 } from './store.js';
import { 부품들모양, 조립검사 } from './validate.js';

const 이름 = z.string().trim().min(1).max(100);
const 디바이스 = z.enum(['desktop', 'mobile']);
// 문이 본문 service 를 접두사 모양으로 이미 봤다. 여기서는 바꾸지 않고 그대로 쓴다
const 만들기본문 = z.object({ service: z.string(), name: 이름, platform: 디바이스, parts: 부품들모양 });
const 고치기본문 = z.object({ name: 이름, platform: 디바이스, parts: 부품들모양, baseVersion: z.number().int().min(1) });
const 되돌리기본문 = z.object({ version: z.number().int().min(1) });

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
async function 조립오류(parts: ScenarioPart[], platform: 'desktop' | 'mobile', service: string): Promise<string[]> {
  const { 카탈로그 } = await 케이스재료(케이스번호들(parts), service);
  return 조립검사(parts, platform, service, 카탈로그);
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
    const { 카탈로그 } = await 케이스재료(줄들.flatMap((s) => 케이스번호들(s.parts)), prefix);
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

  app.get<{ Params: { id: string } }>('/scenarios/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, req.params.id);
    const 본것 = await 상세(id);
    if (본것 === null) return 없음(reply, req.params.id);
    const { 카탈로그 } = await 케이스재료(케이스번호들(본것.parts), 본것.service);
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

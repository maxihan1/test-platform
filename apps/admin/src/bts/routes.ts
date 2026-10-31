// 설정 › BTS 연결 통로 · 실패 카드 [다시 보내기] (도메인/BTS §7). 설정은 /api/settings 아래라 운영(admin) 계정만 닿는다 — 막는 것은 문이다 (auth/gate.ts)

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 사람팜토큰 } from '../execution/farmToken.js';
import { 정수 } from '../routeParams.js';

import { BTS다시보내기 } from './card.js';
import { BTS고를목록 } from './choices.js';
import { BTS부르기, type 부르기함수 } from './client.js';
import { BTS연결끊기, BTS연결읽기, BTS연결저장, BTS열쇠만들기, BTS확인, 상태짝틀, 저장한열쇠, 해결짝틀, type 확인함수 } from './link.js';
import { BTS자동설정 } from './setup.js';

// 같은 주소를 끝 「/」 · 대문자 호스트로 달리 적어도 한 주소로 친다 — 주소가 바뀌면 열쇠를 다시 받으므로(BOT_KEY_REQUIRED) 글자 차이로 막히지 않게.
// 물음표 · # 은 받지 않는다 — 뒤에 /api/v1/… 를 붙여 부른다
const 주소틀 = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//.test(u) && !/[?#]/.test(u), 'baseUrl 은 물음표 · # 없는 http(s) 주소여야 합니다')
  .transform((u) => {
    const 주소 = new URL(u);
    return `${주소.origin}${주소.pathname}`.replace(/\/+$/, '');
  });

const 연결본문 = z.object({
  baseUrl: 주소틀,
  btsProject: z.string().trim().min(1).max(50),
  botKey: z.string().trim().min(1).optional(),
  webhookSecret: z.string().trim().min(1).optional(),
  statusMap: 상태짝틀,
  resolutionMap: 해결짝틀,
});

const 다시보내기본문 = z.object({ tcId: z.string().min(1), env: z.string().min(1) });
const 목록본문 = z.object({ baseUrl: 주소틀, botKey: z.string().trim().min(1).optional() });

/** deploy.sh 한 줄 · BTS 웹훅에 넣을 QA Hub 주소. 브라우저를 연 주소(localhost)는 밖에서 닿지 않는다 — 비었으면 화면이 그것으로 물러선다(serviceTokens.ts 와 같다) */
export const 공개주소 = (): string | null => (process.env.PLATFORM_PUBLIC_URL ?? '').replace(/\/+$/, '') || null;

const 짝이빈가 = (m: Record<string, string>): boolean => Object.values(m).some((v) => v === '');

const 저장코드 = {
  NOT_FOUND: 404,
  SECRETS_REQUIRED: 400,
  BOT_KEY_REQUIRED: 400,
  BTS_UNREACHABLE: 400,
} as const;

export default async function btsLinkRoutes(
  app: FastifyInstance,
  opts: { 확인?: 확인함수; 부르기?: 부르기함수; 사람토큰?: (username: string) => Promise<string | undefined> },
): Promise<void> {
  const 확인 = opts.확인 ?? BTS확인;
  const 부르기 = opts.부르기 ?? BTS부르기;
  const 사람토큰 = opts.사람토큰 ?? 사람팜토큰;

  app.get<{ Params: { projectId: string } }>('/settings/projects/:projectId/bts', async (req, reply) => {
    const id = 정수(req.params.projectId);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.projectId });
    const 보기 = await BTS연결읽기(id);
    return 보기 === null ? reply.code(404).send({ error: 'NOT_FOUND' }) : { ...보기, publicUrl: 공개주소() };
  });

  // 저장 전에도 고르개를 채운다 — 화면이 적은 주소와 열쇠로 부른다. 열쇠를 다시 안 적었으면 같은 주소에 저장한 열쇠를 쓴다
  app.post<{ Params: { projectId: string } }>('/settings/projects/:projectId/bts/choices', async (req, reply) => {
    const id = 정수(req.params.projectId);
    const parsed = 목록본문.safeParse(req.body);
    if (id === null || !parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.success ? req.params.projectId : parsed.error.message });
    }
    const botKey = parsed.data.botKey ?? (await 저장한열쇠(id, parsed.data.baseUrl));
    if (botKey === undefined) return reply.code(400).send({ error: 'BOT_KEY_REQUIRED' });
    const 목록 = await BTS고를목록({ baseUrl: parsed.data.baseUrl, botKey }, 부르기);
    return 목록 ?? reply.code(400).send({ error: 'BTS_UNREACHABLE' });
  });

  app.put<{ Params: { projectId: string } }>('/settings/projects/:projectId/bts', async (req, reply) => {
    const id = 정수(req.params.projectId);
    const parsed = 연결본문.safeParse(req.body);
    if (id === null || !parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.success ? req.params.projectId : parsed.error.message });
    }
    if (짝이빈가(parsed.data.statusMap) || 짝이빈가(parsed.data.resolutionMap)) return reply.code(400).send({ error: 'MAP_INCOMPLETE' });
    const 결과 = await BTS연결저장(id, parsed.data, req.user?.username ?? '', 확인);
    if (결과 === 'OK') return { ok: true };
    return reply.code(저장코드[결과]).send({ error: 결과 });
  });

  app.delete<{ Params: { projectId: string } }>('/settings/projects/:projectId/bts', async (req, reply) => {
    const id = 정수(req.params.projectId);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.projectId });
    if (!(await BTS연결끊기(id))) return reply.code(404).send({ error: 'NOT_FOUND' });
    return reply.code(204).send();
  });

  // 누른 사람의 통합계정 토큰으로 BTS 쪽을 만든다 — 「QA Hub AI」 열쇠는 이슈 등록 · 댓글 · 상태 · 담당자만이라 웹훅 · 규칙을 못 만든다 (도메인/BTS 「열쇠 표」)
  app.post<{ Params: { projectId: string } }>('/settings/projects/:projectId/bts/setup', async (req, reply) => {
    const id = 정수(req.params.projectId);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.projectId });
    const 누가 = req.user?.username ?? '';
    const 토큰 = await 사람토큰(누가);
    if (토큰 === undefined) return reply.code(400).send({ error: 'NO_PERSONAL_TOKEN' });
    const 바탕 = 공개주소();
    if (바탕 === null) return reply.code(400).send({ error: 'PUBLIC_URL_REQUIRED' });
    const 결과 = await BTS자동설정(id, 누가, 토큰, 바탕, 부르기);
    if (결과 === 'NOT_LINKED') return reply.code(409).send({ error: 결과 });
    return { items: 결과 };
  });

  // 원문은 이 응답이 유일하다 — DB 에는 해시와 끝 4자리만 둔다 (CI 토큰과 같다)
  app.post<{ Params: { projectId: string; which: string } }>('/settings/projects/:projectId/bts/keys/:which', async (req, reply) => {
    const id = 정수(req.params.projectId);
    const which = req.params.which;
    if (id === null || (which !== 'deploy' && which !== 'rule')) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    const 결과 = await BTS열쇠만들기(id, which, req.user?.username ?? '');
    if (결과 === 'NOT_FOUND') return reply.code(404).send({ error: 결과 });
    if (결과 === 'NOT_LINKED') return reply.code(409).send({ error: 결과 });
    return reply.code(201).send({ key: 결과.열쇠 });
  });

  // 실행 결과 실패 카드의 [다시 보내기] — (실행, write) 와 그 실행의 서비스는 문이 본다 (auth/routeTable.ts · scope.ts)
  app.post<{ Params: { runId: string } }>('/runs/:runId/bts/resend', async (req, reply) => {
    const runId = 정수(req.params.runId);
    const parsed = 다시보내기본문.safeParse(req.body);
    if (runId === null || !parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.success ? req.params.runId : parsed.error.message });
    }
    const 결과 = await BTS다시보내기(runId, parsed.data.tcId, parsed.data.env);
    if (결과 === 'NOT_LINKED') return reply.code(409).send({ error: 결과 });
    if (결과 === 'NOT_FOUND') return reply.code(404).send({ error: 결과 });
    return reply.code(202).send();
  });
}

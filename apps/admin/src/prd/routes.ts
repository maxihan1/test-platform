// 표준 기획서 HTTP 라우트 — 지금 판 · 판 이력 · 저장 · 일괄 확정 · 되돌리기 · 반영 요청 (도메인/작성 §7 「표준 기획서 통로」)
// 배정과 권한(보기 작성 read · 고치기 작성 write)은 문(auth/gate.ts)이 ?service= 로 이미 봤다. 여기서는 그 서비스 것만 읽고 쓴다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { 번호 } from '../authoring/params.js';
import { 서비스번호 } from '../authoring/routes.js';
import { 반영안됨, 본문상한, 확인필요, 항목검사 } from './rules.js';
import {
  기준판,
  되돌리기,
  반영세우기,
  사람저장,
  일괄확정,
  지금판,
  케이스지도,
  판목록,
  판하나,
  type 저장결과,
  type 저장하는사람,
} from './store.js';

type 질의 = { Querystring: { service?: string } };
type 본문 = 질의 & { Body: Record<string, unknown> | null };

export function 누가(req: FastifyRequest): 저장하는사람 {
  return { username: req.user?.username ?? '알 수 없음', displayName: req.user?.displayName ?? '알 수 없음' };
}

/** 판 번호 칸. 0 은 「아직 표준 기획서가 없다」 */
export function 판번호(값: unknown): number | null {
  return typeof 값 === 'number' && Number.isSafeInteger(값) && 값 >= 0 ? 값 : null;
}

export const 틀린판번호 = (reply: FastifyReply, 칸: string) => reply.code(400).send({ error: 'BAD_PRD', detail: 칸 });

function 보내기(reply: FastifyReply, 결과: 저장결과) {
  if (!('error' in 결과)) return reply.send(결과);
  return reply.code(결과.error === 'PRD_STALE' ? 409 : 400).send(결과);
}

export default async function prdRoutes(app: FastifyInstance): Promise<void> {
  app.get<질의>('/prd', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const 판 = await 지금판(서비스);
    const items = 판?.items ?? [];
    return {
      version: 판?.version ?? 0,
      items,
      cases: await 케이스지도(서비스),
      unapplied: 반영안됨(await 기준판(서비스), items),
      needsCheck: 확인필요(items),
    };
  });

  app.get<질의>('/prd/versions', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    return 판목록(서비스);
  });

  app.get<질의 & { Params: { version: string } }>('/prd/versions/:version', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const version = 번호(req.params.version);
    if (version === null) return 틀린판번호(reply, 'version');
    const 판 = await 판하나(서비스, version);
    return 판 ?? reply.code(404).send({ error: 'NOT_FOUND' });
  });

  // 999 항목이 들어가야 해서 기본 1MiB 보다 넓힌다 (상한은 rules.ts)
  app.put<본문>('/prd', { bodyLimit: 본문상한 }, async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const 접두사 = req.query.service ?? '';
    const baseVersion = 판번호(req.body?.baseVersion);
    if (baseVersion === null) return 틀린판번호(reply, 'baseVersion');
    const 읽음 = 항목검사(req.body?.items, 접두사);
    if ('error' in 읽음) return reply.code(400).send(읽음);
    return 보내기(reply, await 사람저장(서비스, 접두사, baseVersion, 읽음.items, 누가(req)));
  });

  app.post<본문>('/prd/confirm', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const baseVersion = 판번호(req.body?.baseVersion);
    if (baseVersion === null) return 틀린판번호(reply, 'baseVersion');
    return 보내기(reply, await 일괄확정(서비스, baseVersion, req.body?.reqIds, 누가(req)));
  });

  app.post<본문>('/prd/revert', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const baseVersion = 판번호(req.body?.baseVersion);
    if (baseVersion === null) return 틀린판번호(reply, 'baseVersion');
    const toVersion = 판번호(req.body?.toVersion);
    if (toVersion === null || toVersion === 0) return 틀린판번호(reply, 'toVersion');
    const 결과 = await 되돌리기(서비스, req.query.service ?? '', baseVersion, toVersion, 누가(req));
    return 결과 === null ? reply.code(404).send({ error: 'NOT_FOUND' }) : 보내기(reply, 결과);
  });

  app.post<질의>('/prd/apply', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const 결과 = await 반영세우기(서비스, 누가(req));
    return 'error' in 결과 ? reply.code(409).send(결과) : reply.code(201).send(결과);
  });
}

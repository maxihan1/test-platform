// 표준 기획서 HTTP 라우트 — 지금 판 · 판 이력 · 저장 · 일괄 확정 · 되돌리기 · 반영 요청 (도메인/작성 §7 「표준 기획서 통로」)
// 배정과 권한(보기 작성 read · 고치기 작성 write)은 문(auth/gate.ts)이 ?service= 로 이미 봤다. 여기서는 그 서비스 것만 읽고 쓴다

import type { PrdItem } from '@platform/kit';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { 칸되는서비스 } from '../auth/permissions.js';
import { 번호 } from '../authoring/params.js';
import { 서비스번호 } from '../authoring/routes.js';
import { 한국시각 } from '../catalog/exportData.js';
import { lastByCase } from '../execution/history.js';
import { 워드만들기 } from './docx.js';
import { 찾은화면셈 } from './found.js';
import { 반영안됨, 본문상한, 확인필요, 항목검사 } from './rules.js';
import { 반영본문, 화면이맞음채우기, type 화면이맞음 } from './screenRight.js';
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
  테스트비밀번호들,
  type 저장결과,
  type 저장하는사람,
} from './store.js';
import { 추적표만들기 } from './xlsx.js';

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
    const [판, cases, 기준] = await Promise.all([지금판(서비스), 케이스지도(서비스), 기준판(서비스)]);
    const items = 판?.items ?? [];
    return {
      version: 판?.version ?? 0,
      items,
      cases,
      unapplied: 반영안됨(기준?.items ?? null, items),
      needsCheck: 확인필요(items),
      ...(await 찾은화면셈(서비스, items)),
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

  // 워드는 표준 기획서, 엑셀은 요구사항 추적표다 (작성 §3.6 「워드로 내려받기」 · 「메뉴가 곧 요구사항 추적표다」)
  app.get<{ Querystring: { service?: string; format?: string } }>('/prd/export', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const format = req.query.format;
    if (format !== 'docx' && format !== 'xlsx') return reply.code(400).send({ error: 'BAD_FORMAT' });
    const [판, 비밀번호들] = await Promise.all([지금판(서비스), 테스트비밀번호들(서비스)]);
    if (판 === null) return reply.code(404).send({ error: 'NOT_FOUND' });
    const 접두사 = req.query.service ?? '';
    if (format === 'xlsx') return 추적표보내기(reply, 서비스, 접두사, 판, 비밀번호들, 칸되는서비스(req.user?.services ?? [], 'runs', 'read').includes(접두사));
    const 파일 = await 워드만들기(
      { service: 접두사, version: 판.version, generatedAt: 한국시각(new Date().toISOString()), items: 판.items },
      비밀번호들,
    );
    return reply
      .header('content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .header('content-disposition', `attachment; filename="${접두사}-PRD-v${String(판.version)}.docx"`)
      .send(파일);
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

  app.post<본문>('/prd/apply', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const 받은 = 반영본문(req.body);
    if (받은 === null) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    let 화면: 화면이맞음 | undefined;
    if (받은.screenRight !== undefined) {
      // 문은 (작성, write) 만 봤다. 실행 결과를 못 보는 사람이 실패 여부를 떠보는 길이 되지 않게 실행 read 를 따로 본다
      if (!칸되는서비스(req.user?.services ?? [], 'runs', 'read').includes(req.query.service ?? '')) {
        return reply.code(403).send({ error: 'FORBIDDEN', need: 'runs:read' });
      }
      const 채움 = await 화면이맞음채우기(서비스, 받은.screenRight.runId, 받은.screenRight.tcId);
      if ('error' in 채움) return reply.code(채움.code).send({ error: 채움.error });
      화면 = 채움;
    }
    const 결과 = await 반영세우기(서비스, 누가(req), 화면);
    return 'error' in 결과 ? reply.code(409).send(결과) : reply.code(201).send(결과);
  });
}

// 문은 (작성, read) 만 봤다. 마지막 결과는 실행 read 가 있어야 싣는다 — 케이스 목록 엑셀과 같다 (도메인/카탈로그 §7)
async function 추적표보내기(
  reply: FastifyReply,
  서비스: number,
  접두사: string,
  판: { version: number; items: PrdItem[] },
  비밀번호들: string[],
  결과보나: boolean,
) {
  const [cases, 결과들] = await Promise.all([케이스지도(서비스), 결과보나 ? lastByCase([접두사]) : Promise.resolve(null)]);
  const 결과표 = 결과들 === null ? null : new Map(결과들.map((l) => [`${l.tcId}:${l.platform}`, l.status]));
  const generatedAt = new Date().toISOString();
  const 파일 = await 추적표만들기(
    { generatedAt, items: 판.items, cases, 결과: 결과표 === null ? null : (tcId, platform) => 결과표.get(`${tcId}:${platform}`) },
    비밀번호들,
  );
  const 날짜 = 한국시각(generatedAt).slice(0, 10);
  return reply
    .header('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .header('content-disposition', `attachment; filename="${접두사}-RTM-v${String(판.version)}-${날짜}.xlsx"`)
    .send(파일);
}

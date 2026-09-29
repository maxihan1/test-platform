// 보류 케이스 통로 — 값 넣기 · 되돌리기 · 상세 칸 · 머지 판정 · 집기 칸 (SPEC 도메인/작성 §3.6 「★ 보류 케이스」 · §7)
// routes.ts 가 300줄에 닿아 뗐다. routes.ts 가 이 플러그인을 부른다

import type { FastifyInstance, FastifyReply } from 'fastify';

import { 남은수, 보류들, 입력검사, 입력넣기, 입력읽기, 입력지우기, tcId인가, type 보류입력 } from './held.js';
import { 뿌리, 뿌리잠그고, 사슬식, 최신실행 } from './history.js';
import { 번호 } from './params.js';
import { 계정있는줄, 대상줄읽기 } from './reverse.js';
import { db, 한건, type 요청 } from './store.js';

/** 상세에 붙는 칸 — 요청한 그 행 것이다 */
export async function 보류상세(행: { id: number; result: unknown }): Promise<{
  held: (ReturnType<typeof 보류들>[number] & { input: 보류입력[string] | null })[];
  heldOpen: number;
}> {
  const 보류 = 보류들(행.result);
  if (보류.length === 0) return { held: [], heldOpen: 0 };
  const 입력 = await 입력읽기(행.id);
  return { held: 보류.map((h) => ({ ...h, input: 입력[h.tcId] ?? null })), heldOpen: 남은수(보류, 입력) };
}

async function 머지도나(뿌리번호: number): Promise<boolean> {
  const r = await (await db()).query(
    `WITH RECURSIVE ${사슬식('id = $1')}
     SELECT 1 FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
      WHERE a.kind = 'MERGE' AND a.status IN ('PENDING', 'RUNNING') LIMIT 1`,
    [뿌리번호],
  );
  return (r.rowCount ?? 0) > 0;
}

/**
 * 머지 요청의 보류 판정. 통과면 머지 행에 둘 대상 서버(정방향만 — 대조는 원본 것을 쓴다).
 * 막는 것은 서버다 — 화면이 반영 버튼을 막아도 직접 부르면 보류가 main 에 들어간다 (§3.6 ⒜)
 */
export async function 머지보류판정(
  행: 요청,
  서비스: number,
  env: unknown,
): Promise<{ error: 'HELD_OPEN' | 'BAD_ENV'; code: 400 | 409 } | { env: string | null }> {
  const 보류 = 보류들(행.result);
  const 입력 = 보류.length === 0 ? {} : await 입력읽기(행.id);
  if (남은수(보류, 입력) > 0) return { error: 'HELD_OPEN', code: 409 };
  if (행.compare) return env === undefined ? { env: null } : { error: 'BAD_ENV', code: 400 };
  const 채웠나 = Object.values(입력).some((e) => e.removed !== true);
  if (env === undefined) return 채웠나 ? { error: 'BAD_ENV', code: 400 } : { env: null };
  // 운영 줄 보호 — 테스트 계정을 넣은 줄만 3회 실행 대상이 된다 (역방향과 같은 규칙)
  if (typeof env !== 'string' || env === '' || !계정있는줄(await 대상줄읽기(서비스, env))) {
    return { error: 'BAD_ENV', code: 400 };
  }
  return { env };
}

/**
 * 집기(MERGE) 응답에 더할 칸. 입력이 없으면 빈 객체 — 두 키 자체를 안 싣는다.
 * by · at 은 화면용이라 에이전트에게 안 보낸다
 */
export async function 머지집기칸(
  서비스: number,
  머지: 요청,
  머지env: string | null,
): Promise<{ held?: Record<string, unknown>; target?: Record<string, string | null> }> {
  if (머지.sourceId === null) return {};
  const 입력 = await 입력읽기(머지.sourceId);
  if (Object.keys(입력).length === 0) return {};
  const held = Object.fromEntries(Object.entries(입력).map(([tcId, { by: _누가, at: _언제, ...값 }]) => [tcId, 값]));
  const 원본 = await 한건(머지.sourceId);
  const env = 원본?.compare === true ? 원본.env : 머지env;
  if (env === null) return { held };
  const 줄 = await 대상줄읽기(서비스, env);
  return {
    held,
    target: { env, baseUrl: 줄?.baseUrl ?? null, loginId: 줄?.loginId ?? null, loginPassword: 줄?.loginPassword ?? null },
  };
}

type 판정 = { 행: 요청 } | { code: number; error: string; detail?: string };

/** 넣기 · 되돌리기 공통 — 머지가 돌면 에이전트가 집은 입력과 화면이 갈린다. 화면이 보는 결과는 최신 끝난 실행 것이다 */
async function 자리판정(id: number): Promise<판정> {
  const 행 = await 한건(id);
  if (행 === null) return { code: 404, error: 'NOT_FOUND' };
  const 뿌리번호 = (await 뿌리(id)) ?? id;
  if (await 머지도나(뿌리번호)) return { code: 409, error: 'MERGE_ACTIVE' };
  if (행.status !== 'DONE' || (await 최신실행(뿌리번호)) !== id) return { code: 409, error: 'NOT_LATEST' };
  return { 행 };
}

async function 보내기(reply: FastifyReply, 결과: 판정): Promise<FastifyReply> {
  if ('error' in 결과) return reply.code(결과.code).send({ error: 결과.error, detail: 결과.detail });
  return reply.send({ ok: true });
}

export async function 보류통로(app: FastifyInstance): Promise<void> {
  app.put<{ Params: { id: string; tcId: string }; Body: unknown }>(
    '/authoring/requests/:id/held/:tcId',
    async (req, reply) => {
      const id = 번호(req.params.id);
      if (id === null) return reply.code(400).send({ error: 'BAD_ID' });
      const tcId = req.params.tcId;
      if (!tcId인가(tcId)) return reply.code(400).send({ error: 'BAD_HELD', detail: '케이스 번호 모양' });
      // 머지 세우기와 같은 뿌리 잠금 — 확인과 쓰기 사이에 머지가 서면 집은 입력과 저장된 입력이 갈린다
      const 결과 = await 뿌리잠그고((await 뿌리(id)) ?? id, async (): Promise<판정> => {
        const 자리 = await 자리판정(id);
        if ('error' in 자리) return 자리;
        const 보류 = 보류들(자리.행.result).find((h) => h.tcId === tcId);
        if (보류 === undefined) return { code: 400, error: 'BAD_HELD', detail: `보류가 아닌 케이스: ${tcId}` };
        const 넣을것 = 입력검사(보류, req.body);
        if (typeof 넣을것 === 'string') return { code: 400, error: 'BAD_HELD', detail: 넣을것 };
        await 입력넣기(id, tcId, 넣을것, req.user?.username ?? '');
        return 자리;
      });
      return 보내기(reply, 결과);
    },
  );

  app.delete<{ Params: { id: string; tcId: string } }>('/authoring/requests/:id/held/:tcId', async (req, reply) => {
    const id = 번호(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'BAD_ID' });
    const tcId = req.params.tcId;
    if (!tcId인가(tcId)) return reply.code(400).send({ error: 'BAD_HELD', detail: '케이스 번호 모양' });
    const 결과 = await 뿌리잠그고((await 뿌리(id)) ?? id, async (): Promise<판정> => {
      const 자리 = await 자리판정(id);
      if (!('error' in 자리)) await 입력지우기(id, tcId);
      return 자리;
    });
    return 보내기(reply, 결과);
  });
}

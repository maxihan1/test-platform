// 반영 때 겹침 통로 — 고르기 · 되돌리기 · 상세 칸 · 반영 판정 · 집기 칸 · 끝내기 검사 (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」 · §7)
// routes.ts · agentRoutes.ts 가 300줄에 닿아 뗐다. routes.ts 가 이 플러그인을 부른다

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Pool, PoolClient } from 'pg';

import { 가져갈결정, 겹침들, 겹침모양검사, 결정인가, 남은겹침수, type 겹침, type 겹침입력 } from './conflicts.js';
import { tcId인가 } from './held.js';
import { 뿌리, 뿌리잠그고, 사슬식, 최신식 } from './history.js';
import { 번호 } from './params.js';
import { db, type 요청 } from './store.js';

type 손 = Pool | PoolClient;

/**
 * 그 실행을 원본으로 하는 **가장 최근 반영**이 겹침으로 실패했을 때만 그 목록.
 * 뒤에 반영이 서거나 다른 까닭으로 실패했으면 빈 목록이다 — 결정은 원본 행에 남아 다음 반영에 실린다
 */
async function 최근겹침(손: 손, 원본: number): Promise<겹침[]> {
  const r = await 손.query<{ status: string; result: unknown }>(
    `SELECT status, result FROM authoring_request WHERE kind = 'MERGE' AND source_id = $1 ORDER BY id DESC LIMIT 1`,
    [원본],
  );
  const 줄 = r.rows[0];
  return 줄?.status === 'FAILED' ? 겹침들(줄.result) : [];
}

async function 결정읽기(손: 손, id: number): Promise<겹침입력> {
  const r = await 손.query<{ conflict_input: 겹침입력 | null }>('SELECT conflict_input FROM authoring_request WHERE id = $1', [id]);
  return r.rows[0]?.conflict_input ?? {};
}

/** 상세에 붙는 칸 — 요청한 그 행을 원본으로 하는 반영 것이다 */
export async function 겹침상세(id: number): Promise<{ conflicts: (겹침 & { input: 겹침입력[string] | null })[]; conflictsOpen: number }> {
  const 풀 = await db();
  const 목록 = await 최근겹침(풀, id);
  if (목록.length === 0) return { conflicts: [], conflictsOpen: 0 };
  const 입력 = await 결정읽기(풀, id);
  return { conflicts: 목록.map((c) => ({ ...c, input: 입력[c.tcId] ?? null })), conflictsOpen: 남은겹침수(목록, 입력) };
}

/**
 * 반영 세우기의 겹침 판정 — **뿌리 잠금 안에서** 잠금 쥔 연결로 부른다(보류 판정과 같은 까닭).
 * detail 은 문장이다 — 이 코드를 모르는 화면도 detail 을 그대로 보인다
 */
export async function 반영겹침판정(손: PoolClient, 원본: number): Promise<{ error: 'CONFLICT_OPEN'; code: 409; detail: string } | null> {
  const 목록 = await 최근겹침(손, 원본);
  if (목록.length === 0) return null;
  const 남은 = 남은겹침수(목록, await 결정읽기(손, 원본));
  return 남은 === 0 ? null : { error: 'CONFLICT_OPEN', code: 409, detail: `겹치는 케이스 ${String(남은)}건을 아직 고르지 않았다` };
}

/** 집기 응답에 더할 칸 — 반영 행에만. 원본의 결정 **전부**다(거르기는 에이전트가 새로 찾은 목록으로 한다) */
export async function 집기겹침칸(집은것: 요청): Promise<{ conflicts?: { tcId: string; action: 'KEEP' | 'DROP' }[] }> {
  if (집은것.kind !== 'MERGE') return {};
  if (집은것.sourceId === null) return { conflicts: [] };
  return { conflicts: 가져갈결정(await 결정읽기(await db(), 집은것.sourceId)) };
}

/** 끝내기 result.conflicts — 반영의 실패에만 실리고 모양이 맞아야 한다. 아니면 400 BAD_CONFLICTS */
export function 끝내기겹침맞나(kind: 요청['kind'], status: string, conflicts: unknown): boolean {
  if (conflicts === undefined) return true;
  return kind === 'MERGE' && status === 'FAILED' && 겹침모양검사(conflicts) !== null;
}

type 판정 = { ok: true } | { code: number; error: string; detail?: string };

/** 고르기 · 되돌리기 공통 — 보류 통로와 같은 판정(NOT_FOUND · MERGE_ACTIVE · NOT_LATEST)에 목록 안의 tcId 인지까지 */
async function 자리판정(손: PoolClient, id: number, 뿌리번호: number, tcId: string): Promise<판정> {
  const 행 = await 손.query<{ status: string }>('SELECT status FROM authoring_request WHERE id = $1', [id]);
  if (행.rows[0] === undefined) return { code: 404, error: 'NOT_FOUND' };
  const 머지 = await 손.query(
    `WITH RECURSIVE ${사슬식('id = $1')}
     SELECT 1 FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
      WHERE a.kind = 'MERGE' AND a.status IN ('PENDING', 'RUNNING') LIMIT 1`,
    [뿌리번호],
  );
  if ((머지.rowCount ?? 0) > 0) return { code: 409, error: 'MERGE_ACTIVE' };
  const 최신 = await 손.query<{ id: string }>(`WITH RECURSIVE ${사슬식('id = $1')} SELECT ${최신식('사슬')} AS id`, [뿌리번호]);
  if (행.rows[0].status !== 'DONE' || Number(최신.rows[0]?.id) !== id) return { code: 409, error: 'NOT_LATEST' };
  if (!(await 최근겹침(손, id)).some((c) => c.tcId === tcId)) return { code: 400, error: 'BAD_CONFLICT', detail: tcId };
  return { ok: true };
}

async function 보내기(reply: FastifyReply, 결과: 판정): Promise<FastifyReply> {
  if ('error' in 결과) return reply.code(결과.code).send({ error: 결과.error, detail: 결과.detail });
  return reply.send({ ok: true });
}

/** 번호 · tcId 모양을 본 뒤 뿌리 잠금 안에서 자리를 판정하고 `일` 을 한다 */
async function 고르기틀(
  reply: FastifyReply,
  params: { id: string; tcId: string },
  일: (손: PoolClient, id: number) => Promise<판정>,
): Promise<FastifyReply> {
  const id = 번호(params.id);
  if (id === null) return reply.code(400).send({ error: 'BAD_ID' });
  const tcId = params.tcId;
  if (!tcId인가(tcId)) return reply.code(400).send({ error: 'BAD_CONFLICT', detail: tcId });
  const 뿌리번호 = (await 뿌리(id)) ?? id;
  const 결과 = await 뿌리잠그고(뿌리번호, async (손): Promise<판정> => {
    const 자리 = await 자리판정(손, id, 뿌리번호, tcId);
    return 'error' in 자리 ? 자리 : 일(손, id);
  });
  return 보내기(reply, 결과);
}

export async function 겹침통로(app: FastifyInstance): Promise<void> {
  app.put<{ Params: { id: string; tcId: string }; Body: { action?: unknown } | undefined }>(
    '/authoring/requests/:id/conflicts/:tcId',
    async (req, reply) =>
      고르기틀(reply, req.params, async (손, id): Promise<판정> => {
        const action = req.body?.action;
        if (!결정인가(action)) return { code: 400, error: 'BAD_CONFLICT', detail: req.params.tcId };
        const 고른 = { action, by: req.user?.username ?? '', at: new Date().toISOString() };
        await 손.query(
          `UPDATE authoring_request
              SET conflict_input = COALESCE(conflict_input, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb)
            WHERE id = $1`,
          [id, req.params.tcId, JSON.stringify(고른)],
        );
        return { ok: true };
      }),
  );

  app.delete<{ Params: { id: string; tcId: string } }>('/authoring/requests/:id/conflicts/:tcId', async (req, reply) =>
    고르기틀(reply, req.params, async (손, id): Promise<판정> => {
      await 손.query(`UPDATE authoring_request SET conflict_input = NULLIF(conflict_input - $2::text, '{}'::jsonb) WHERE id = $1`, [
        id,
        req.params.tcId,
      ]);
      return { ok: true };
    }),
  );
}

// 작성 중단·폐기 통로와 진척 모양 검사 · 상세의 중단 칸 (SPEC 도메인/작성 §7 「중단 · 폐기 · 진척」)
// routes.ts 가 등록한다 — app.ts 는 routes.ts 하나만 안다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { 번호 } from './params.js';
import { db, 빚기, 이어받기되나, 칸들, 한건, type 요청, type 행 } from './store.js';

// 신호가 이보다 오래 없으면 에이전트가 죽은 것으로 본다. 에이전트는 30초마다 신호를 보낸다
const 묵음 = `COALESCE(stage_at, started_at) < now() - interval '3 minutes'`;

const 정수칸 = ['elapsedSec', 'limitSec', 'caseFiles', 'tokens', 'screens'] as const;
const 필수칸 = new Set(['childRunning', 'elapsedSec', 'limitSec', 'caseFiles', 'tokens']);
const 아는칸 = new Set([...필수칸, 'screens', 'lastAction', 'lastActionAt']);

/**
 * 에이전트가 올린 진척이 정해진 모양인가. 아니면 null.
 * 서버가 가두지 않으면 JSONB 칸에 아무 것이나 쌓이고 화면이 그것을 그대로 그린다
 */
export function 진척검사(값: unknown): Record<string, unknown> | null {
  if (typeof 값 !== 'object' || 값 === null || Array.isArray(값)) return null;
  const 진척 = 값 as Record<string, unknown>;
  const 칸들 = Object.keys(진척);
  if (칸들.some((칸) => !아는칸.has(칸)) || [...필수칸].some((칸) => !(칸 in 진척))) return null;
  if (typeof 진척.childRunning !== 'boolean') return null;
  for (const 칸 of 정수칸) {
    const v = 진척[칸];
    if (v !== undefined && !(Number.isSafeInteger(v) && (v as number) >= 0)) return null;
  }
  const 동작 = 진척.lastAction;
  if (동작 !== undefined && (typeof 동작 !== 'string' || 동작.length < 1 || 동작.length > 160)) return null;
  const 때 = 진척.lastActionAt;
  if (때 !== undefined && (typeof 때 !== 'string' || Number.isNaN(Date.parse(때)))) return null;
  return 진척;
}

/** 요청한 사람이거나 admin 인가. 자료 올리기·줄 세우기와 같은 규칙에 admin 을 더했다 (§7) */
function 손댈수있나(req: FastifyRequest, 행: 요청): boolean {
  return 행.requestedBy === req.user?.username || req.user?.role === 'admin';
}

async function 내행(req: FastifyRequest, reply: FastifyReply): Promise<요청 | null> {
  const id = 번호((req.params as { id?: string }).id);
  if (id === null) {
    await reply.code(400).send({ error: 'BAD_ID' });
    return null;
  }
  const 행 = await 한건(id);
  if (행 === null) {
    await reply.code(404).send({ error: 'NOT_FOUND' });
    return null;
  }
  // 서비스 경계는 문이 봤다(라우트표 「작성요청」 갈래). 여기서는 같은 서비스의 남을 막는다
  if (!손댈수있나(req, 행)) {
    await reply.code(403).send({ error: 'NOT_REQUESTER' });
    return null;
  }
  return 행;
}

/**
 * 멈춘다. **한 문장이 판정이다** — 읽고 나서 고치면 그 사이에 에이전트가 끝내거나 집는다.
 * 대기 중·신호 끊김은 곧장 STOPPED, 자식 전(progress NULL)이거나 자식이 도는 중이면 요청만 적는다(처음 누른 사람을 지킨다).
 * 자식 전 요청은 에이전트가 자식을 띄우기 직전에 보고 안 띄운다
 */
async function 멈추기(id: number, 누가: string): Promise<'STOPPED' | 'RUNNING' | null> {
  const 곧장 = `(status = 'PENDING' OR ${묵음})`;
  const r = await (await db()).query<{ status: 'STOPPED' | 'RUNNING' }>(
    `UPDATE authoring_request
        SET status = CASE WHEN ${곧장} THEN 'STOPPED' ELSE status END,
            stop_reason = CASE WHEN status = 'PENDING' THEN 'USER' WHEN ${묵음} THEN 'AGENT_LOST' ELSE stop_reason END,
            stopped_by = CASE WHEN ${곧장} THEN $2 ELSE stopped_by END,
            finished_at = CASE WHEN ${곧장} THEN now() ELSE finished_at END,
            stop_requested_at = COALESCE(stop_requested_at, now()),
            stop_requested_by = COALESCE(stop_requested_by, $2)
      WHERE id = $1 AND kind <> 'MERGE' AND discarded_at IS NULL
        AND (status = 'PENDING'
             OR (status = 'RUNNING' AND (${묵음} OR progress IS NULL OR progress->>'childRunning' = 'true')))
      RETURNING status`,
    [id, 누가],
  );
  return r.rows[0]?.status ?? null;
}

async function 버리기(id: number): Promise<boolean> {
  const r = await (await db()).query(
    `UPDATE authoring_request SET discarded_at = now()
      WHERE id = $1 AND status IN ('FAILED', 'STOPPED', 'DRAFT') AND discarded_at IS NULL`,
    [id],
  );
  return r.rowCount === 1;
}

/**
 * 상세 한 건을 한 번에 읽는다 — 행과 중단 칸을 따로 읽으면 그 사이에 상태가 바뀌어 버튼이 어긋난다.
 * 버튼 두 개는 부른 사람 기준으로 서버가 정한다 — 화면은 이것만 보고 그린다
 */
export async function 상세읽기(req: FastifyRequest, id: number) {
  const r = await (await db()).query<
    행 & {
      progress: Record<string, unknown> | null;
      stopped_by: string | null;
      stopped_by_name: string | null;
      stale: boolean;
      resumable: boolean;
      resumed_by: string | null;
    }
  >(
    `SELECT ${칸들}, progress, stopped_by,
            (SELECT display_name FROM app_user WHERE username = stopped_by) AS stopped_by_name,
            ${묵음} AS stale,
            ${이어받기되나('authoring_request')} AS resumable,
            (SELECT 이은것.id FROM authoring_request 이은것 WHERE 이은것.resume_from = authoring_request.id) AS resumed_by
       FROM authoring_request WHERE id = $1`,
    [id],
  );
  const row = r.rows[0];
  if (row === undefined) return null;
  const { progress, stopped_by, stopped_by_name: display_name, stale, resumable, resumed_by } = row;
  const 행 = 빚기(row);
  const 됨 = 손댈수있나(req, 행) && 행.discardedAt === null;
  // 자식 전(NULL)도 멈출 수 있다 — 에이전트가 자식을 띄우기 직전에 요청을 본다 (§7 고침 3)
  const 도는중 = (progress === null || progress.childRunning === true) && 행.stopRequestedAt === null;
  return {
    ...행,
    progress,
    stoppedBy: stopped_by,
    stoppedByName: stopped_by === null || stopped_by === 'system' ? null : (display_name ?? stopped_by),
    canStop:
      됨 &&
      행.kind !== 'MERGE' &&
      (행.status === 'PENDING' || (행.status === 'RUNNING' && (도는중 || stale === true))),
    canDiscard: 됨 && ['FAILED', 'STOPPED', 'DRAFT'].includes(행.status),
    // 이어서 작성은 재실행과 같은 규칙 — 요청한 사람만이 아니라 작성 권한이면 누구나 (§7 「이어하기」)
    canResume: resumable,
    resumedBy: resumed_by === null ? null : Number(resumed_by),
  };
}

export async function 중단통로(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string } }>('/authoring/requests/:id/stop', async (req, reply) => {
    const 행 = await 내행(req, reply);
    if (행 === null) return reply;
    // 머지는 멈추는 통로가 없다 — 저장소를 반쯤 바꾼 채 멈추면 되돌릴 쪽이 없다
    if (행.kind === 'MERGE') return reply.code(409).send({ error: 'NOT_STOPPABLE' });
    const 결과 = await 멈추기(행.id, req.user?.username ?? '');
    if (결과 !== null) return { status: 결과 };
    // 자식이 끝나 올리는 중이면 PR 을 잃으므로 안 받는다. 그 밖은 멈출 것이 없다
    const 지금 = await 한건(행.id);
    const 올리는중 = 지금?.status === 'RUNNING' && 지금.discardedAt === null;
    return reply.code(409).send({ error: 올리는중 ? 'NOT_STOPPABLE' : 'NOT_RUNNING' });
  });

  app.post<{ Params: { id: string } }>('/authoring/requests/:id/discard', async (req, reply) => {
    const 행 = await 내행(req, reply);
    if (행 === null) return reply;
    if (!(await 버리기(행.id))) return reply.code(409).send({ error: 'NOT_DISCARDABLE' });
    return { ok: true };
  });
}

// 수정 AI 결과 통로 — 에이전트가 낸 PR · 원인 분석을 그 요청의 result.bugfix 에 두고 BTS 로 보낼 줄을 넣는다 (도메인/BTS §7 「POST /api/authoring/requests/:id/bugfix」)

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { 집은쪽인가 } from '../authoring/agentRoutes.js';

import { 글자르기, 연결읽기, 넘기기, 수정PR주소인가, 수정있나, 자리로 } from './bugfix.js';
import { 넘길사람찾기 } from './bugfixOwner.js';
import { BTS부르기, 이슈읽기, type 부르기함수 } from './client.js';
import { 보낼줄넣기 } from './outbox.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 상한 — 이 위는 AI 가 잘못 쓴 것으로 본다. 에이전트가 넘기 전에 잘라 보낸다
export const 수정상한 = { 글: 8000, 파일: 200, 경로: 500, 사람: 20, 이름: 200 } as const;

const 사람틀 = z.object({ email: z.string().max(수정상한.이름), name: z.string().max(수정상한.이름) }).strict();
const 사람들 = z.array(사람틀).max(수정상한.사람).default([]);
const 결과틀 = z.union([
  z.object({ prUrl: z.string(), summary: z.string().max(수정상한.글), files: z.array(z.string().min(1).max(수정상한.경로)).min(1).max(수정상한.파일), owners: 사람들 }).strict(),
  z.object({ analysis: z.string().min(1).max(수정상한.글), files: z.array(z.string().min(1).max(수정상한.경로)).max(수정상한.파일).default([]), owners: 사람들 }).strict(),
]);

export default async function btsBugfixRoutes(app: FastifyInstance, opts: { 부르기?: 부르기함수 }): Promise<void> {
  const 부르기 = opts.부르기 ?? BTS부르기;
  app.post<{ Params: { id: string }; Body: unknown }>('/authoring/requests/:id/bugfix', async (req, reply) => {
    const 행 = await 집은쪽인가(req, reply);
    if (행 === null) return reply;
    if (행.kind !== 'BUGFIX' || 행.serviceId === null) return reply.code(400).send({ error: 'BAD_KIND', detail: 행.kind });
    if (행.status !== 'RUNNING') return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
    const 꼴 = 결과틀.safeParse(req.body);
    if (!꼴.success) return reply.code(400).send({ error: 'BAD_BUGFIX', detail: 꼴.error.issues[0]?.path.join('.') ?? '' });
    const 몸 = 꼴.data;
    const params = 행.params as Record<string, unknown>;
    if ('prUrl' in 몸 && !수정PR주소인가(몸.prUrl, params)) return reply.code(400).send({ error: 'BAD_BUGFIX', detail: 'prUrl' });
    const pool = await db();
    // 저장부터 한다 — BTS 사람 찾기가 느려 에이전트의 응답 기다림(30초)을 넘기면 PR 이 기록되지 않는다.
    // 같은 일이 결과를 두 번 내면 BTS 댓글도 두 번 간다 — 처음 한 번만 받는다. PR 주소는 끝내기가 닿지 않아도 남게 pr_url 에도 적는다
    const r = await pool.query(
      `UPDATE authoring_request SET result = jsonb_build_object('bugfix', $2::jsonb), pr_url = COALESCE($3, pr_url)
        WHERE id = $1 AND status = 'RUNNING' AND NOT (COALESCE(result, '{}'::jsonb) ? 'bugfix')`,
      [행.id, JSON.stringify({ ...('prUrl' in 몸 ? { prUrl: 몸.prUrl, summary: 몸.summary } : { analysis: 몸.analysis }), files: 몸.files, owner: null }), 'prUrl' in 몸 ? 몸.prUrl : null],
    );
    if (r.rowCount !== 1) return reply.code(409).send({ error: 'NOT_RUNNING', detail: '' });
    void BTS에알리기(행.id, 행.serviceId, params, 몸, 부르기).catch((err: unknown) =>
      req.log.error(`[bts] ${String(행.id)}번 수정 결과를 BTS 보낼 줄에 넣지 못했다: ${err instanceof Error ? err.message : String(err)}`),
    );
    return reply.code(201).send({});
  });
}

type 결과몸 = z.infer<typeof 결과틀>;

/** 넘길 사람을 찾아 적고 BTS 로 보낼 줄을 넣는다. 연결을 끊었으면 알릴 길이 없어 결과만 남는다(맡은 이슈 · 짝 기록처럼) */
export async function BTS에알리기(id: number, serviceId: number, params: Record<string, unknown>, 몸: 결과몸, 부르기: 부르기함수 = BTS부르기): Promise<void> {
  const pool = await db();
  const issueKey = String(params.issueKey ?? '');
  const projectId = Number((await pool.query<{ project_id: string }>('SELECT project_id FROM service WHERE id = $1', [serviceId])).rows[0]?.project_id);
  const l = await 연결읽기(projectId);
  if (l === null) return;
  const 구성요소 = await 이슈읽기(자리로(l), issueKey, 부르기).then((x) => x.componentIds, () => []);
  const 사람 = await 넘길사람찾기(자리로(l), l.bts_project, 몸.owners, 구성요소, 부르기);
  // 재검증 또 실패 넘기기 · 다시 맡기 거절이 이 사람에게 돌린다
  await pool.query(`UPDATE authoring_request SET result = jsonb_set(result, '{bugfix,owner}', COALESCE(to_jsonb($2::text), 'null'::jsonb)) WHERE id = $1`, [id, 사람]);
  const 파일 = 몸.files.length === 0 ? [] : ['', '고친 파일', ...몸.files.map((f) => `- ${f}`)];
  if ('prUrl' in 몸) {
    // 차례가 곧 BTS 에 닿는 차례다(보낼 줄은 같은 이슈를 앞 줄부터) — 댓글 → 「코드 리뷰」 → 담당자
    const 코드리뷰 = l.status_map.CODE_REVIEW ?? '';
    const 댓글 = [`BTS 에이전트가 수정 PR 을 올렸어요 — ${몸.prUrl}`, '', 몸.summary, ...파일, '', '초안 PR 이에요. 검토하고 병합은 사람이 해요'].join('\n');
    await 보낼줄넣기({ projectId, kind: 'COMMENT', issueKey, payload: { body: 글자르기(댓글) } });
    if (코드리뷰 !== '') await 보낼줄넣기({ projectId, kind: 'TRANSITION', issueKey, payload: { toStatusKey: 코드리뷰 } });
    if (사람 !== null) await 보낼줄넣기({ projectId, kind: 'ASSIGN', issueKey, payload: { assigneeId: 사람 } });
    else await 보낼줄넣기({ projectId, kind: 'COMMENT', issueKey, payload: { body: '넘길 사람을 찾지 못했어요 — 담당자를 정해 주세요' } });
    return;
  }
  const 머리 = params.repo === null || params.repo === undefined ? '코드 없음 — 원인 분석만' : 'BTS 에이전트가 고치지 못해 원인 분석을 남겨요';
  await 넘기기(projectId, issueKey, [머리, '', 몸.analysis, ...파일].join('\n'), 사람);
}

/**
 * 끝내기 몸이 수정 일에 맞지 않으면 그 칸 — 결과 통로로 PR · 원인 분석을 먼저 올려야 DONE 이다(BTS 에 알릴 것이 없으면 이슈가 AI 에 묶여 멈춘다).
 * 끝내기의 result 는 저장된 result 를 덮어 받지 않는다
 */
export function 수정끝내기틀림(저장된: unknown, status: string, 실은result: unknown): string | null {
  if (status === 'DONE' && !수정있나(저장된)) return 'bugfix';
  return 실은result === undefined ? null : 'result';
}

/** 끝내기 뒤 — 결과 없이 끝났으면 사람에게 넘긴다. 기다리지 않는다(에이전트의 끝내기 답이 BTS 를 기다리지 않게) */
export function 수정끝냄(
  행: { id: number; serviceId: number; params: unknown; result: unknown },
  멈춤이유: string | undefined,
  error: unknown,
  log: { error: (m: string) => void },
): { ok: true } {
  if (!수정있나(행.result)) {
    void 수정끝난뒤(행, 멈춤이유, typeof error === 'string' ? error : undefined).catch((err: unknown) => log.error(`[bts] ${String(행.id)}번 수정 일을 사람에게 넘기지 못했다: ${String(err)}`));
  }
  return { ok: true };
}

/**
 * 수정 일이 결과 없이 끝났다(실패 · 중단) — 이슈가 「QA Hub AI」에 묶여 멈추지 않게 사람에게 넘긴다.
 * 에이전트가 꺼져 멈춘 줄은 AI 탓이 아니라 같은 칸으로 새로 세운다(PRD 초안과 같은 판단)
 */
export async function 수정끝난뒤(행: { id: number; serviceId: number; params: unknown }, 멈춤이유: string | undefined, 까닭: string | undefined, 부르기: 부르기함수 = BTS부르기): Promise<void> {
  const pool = await db();
  if (멈춤이유 === 'AGENT_RESTART') {
    await pool.query(
      `WITH 옛 AS (UPDATE authoring_request SET discarded_at = now() WHERE id = $1 AND kind = 'BUGFIX' AND discarded_at IS NULL RETURNING service_id, params, requested_by, requested_by_name)
       INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
       SELECT service_id, 'BUGFIX', params, requested_by, requested_by_name, 'PENDING' FROM 옛 ON CONFLICT DO NOTHING`,
      [행.id],
    );
    return;
  }
  const issueKey = String((행.params as Record<string, unknown>).issueKey ?? '');
  const projectId = Number((await pool.query<{ project_id: string }>('SELECT project_id FROM service WHERE id = $1', [행.serviceId])).rows[0]?.project_id);
  const l = await 연결읽기(projectId);
  if (l === null || issueKey === '') return;
  const 구성요소 = await 이슈읽기(자리로(l), issueKey, 부르기).then((x) => x.componentIds, () => []);
  const 사람 = await 넘길사람찾기(자리로(l), l.bts_project, [], 구성요소, 부르기);
  await 넘기기(projectId, issueKey, `BTS 에이전트가 이 버그를 끝내지 못했어요${까닭 === undefined || 까닭 === '' ? '' : ` — ${까닭.slice(0, 500)}`}\n사람이 봐 주세요`, 사람);
}

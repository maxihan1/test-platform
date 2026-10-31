// BTS 로 보낼 것을 「보낼 줄」 표에 넣고 60초마다 보낸다 — 1분 간격 5번 · 4xx 는 바로 멈춤 · 재기동 뒤 이어감 (도메인/BTS 결정 17)
// 틀은 정기 실행(execution/scheduled.ts)이다. 줄이 DB 에 있어 admin 이 다시 떠도 보낼 것을 잃지 않는다

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

import { BTS부르기, type 부르기함수 } from './client.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export type 보낼종류 = 'CREATE' | 'COMMENT' | 'TRANSITION' | 'ASSIGN';

export interface 보낼줄 {
  projectId: number;
  kind: 보낼종류;
  /** BTS 에 그대로 보낼 몸. 밖으로 나가는 글은 넣기 전에 증적 비밀값 가림을 거친다(도메인/BTS 「버그 바퀴」) */
  payload: unknown;
  issueKey?: string;
  serviceId?: number;
  runId?: number;
  tcId?: string;
  env?: string;
}

/** 줄 번호를 돌려준다. 한 테스트 · 한 대상 서버에 기다리는 CREATE 가 이미 있으면 새로 안 넣고 null — 첫 실패 실행으로 올린다 */
export async function 보낼줄넣기(줄: 보낼줄): Promise<number | null> {
  const pool = await db();
  const r = await pool.query<{ id: string }>(
    `INSERT INTO bts_outbox (project_id, kind, payload, issue_key, service_id, run_id, tc_id, env)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING RETURNING id`,
    [줄.projectId, 줄.kind, JSON.stringify(줄.payload), 줄.issueKey ?? null, 줄.serviceId ?? null, 줄.runId ?? null, 줄.tcId ?? null, 줄.env ?? null],
  );
  return r.rows[0] === undefined ? null : Number(r.rows[0].id);
}

export const 최대횟수 = 5;

// BTS 이슈 API — 만들기 · 댓글 · 상태 옮기기 · 담당자 (BTS IssueController · CommentController)
const 갈곳 = {
  CREATE: () => ['POST', '/api/v1/issues'],
  COMMENT: (key: string) => ['POST', `/api/v1/issues/${encodeURIComponent(key)}/comments`],
  TRANSITION: (key: string) => ['POST', `/api/v1/issues/${encodeURIComponent(key)}/transition`],
  ASSIGN: (key: string) => ['PATCH', `/api/v1/issues/${encodeURIComponent(key)}/assignee`],
} as const;

interface 집은줄 {
  id: string;
  kind: 보낼종류;
  issue_key: string | null;
  payload: unknown;
  tries: number;
  base_url: string | null;
  bot_key: string | null;
}

type 결과 = { 상태: 'SENT'; issueKey?: string | null } | { 상태: 'RETRY' | 'GAVE_UP'; 까닭: string };

// 408 · 429 는 BTS 가 잠깐 바쁜 것이라 다시 보낸다. 나머지 4xx 는 몇 번을 보내도 같은 답이라 바로 멈춘다
const 다시보낼4xx = new Set([408, 429]);

function 상태로(status: number): 결과 | null {
  if (status >= 200 && status < 300) return null;
  if (status === 401 || status === 403) return { 상태: 'GAVE_UP', 까닭: `권한 없음 — QA Hub AI 열쇠를 확인하세요 (${String(status)})` };
  if (status >= 400 && status < 500 && !다시보낼4xx.has(status)) return { 상태: 'GAVE_UP', 까닭: `BTS 가 요청을 거절했습니다 (${String(status)})` };
  return { 상태: 'RETRY', 까닭: `BTS 가 답하지 못했습니다 (${String(status)})` };
}

async function 하나보내기(줄: 집은줄, 부르기: 부르기함수): Promise<결과> {
  // 연결을 끊었으면 보낼 곳이 없다 — 줄은 남기고 멈춘다(맡은 이슈 · 짝 기록처럼)
  if (줄.base_url === null || 줄.bot_key === null) return { 상태: 'GAVE_UP', 까닭: 'BTS 연결이 없습니다' };
  if (줄.kind !== 'CREATE' && 줄.issue_key === null) return { 상태: 'GAVE_UP', 까닭: '보낼 이슈 키가 없습니다' };
  const [method, 경로] = 갈곳[줄.kind](줄.issue_key ?? '');
  try {
    const r = await 부르기({ baseUrl: 줄.base_url, botKey: 줄.bot_key }, method, 경로, 줄.payload);
    const 실패 = 상태로(r.status);
    if (실패 !== null) return 실패;
    return 줄.kind === 'CREATE'
      ? { 상태: 'SENT', issueKey: (r.json as { data?: { key?: string } } | null)?.data?.key ?? null }
      : { 상태: 'SENT' };
  } catch (err) {
    return { 상태: 'RETRY', 까닭: `BTS 에 닿지 않습니다 — ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * 때가 된 줄을 집어 보낸다. 집을 때 next_at 을 5분 뒤로 미뤄 둔다 — 보내는 사이 다음 점검이 같은 줄을 또 집지 않게.
 * 보내다 admin 이 꺼지면 5분 뒤 다시 집힌다(횟수는 그대로)
 */
export async function 보낼줄점검(부르기: 부르기함수 = BTS부르기): Promise<{ 보냄: number; 다시: number; 멈춤: number }> {
  const pool = await db();
  const 집음 = await pool.query<집은줄>(
    `WITH 때된 AS (
       SELECT id FROM bts_outbox WHERE state = 'PENDING' AND next_at <= now() ORDER BY id LIMIT 20 FOR UPDATE SKIP LOCKED
     ), 집은 AS (
       UPDATE bts_outbox o SET next_at = now() + interval '5 minutes' FROM 때된 WHERE o.id = 때된.id
       RETURNING o.id, o.project_id, o.kind, o.issue_key, o.payload, o.tries
     )
     SELECT 집은.*, l.base_url, l.bot_key FROM 집은 LEFT JOIN bts_link l ON l.project_id = 집은.project_id ORDER BY 집은.id`,
  );
  const 셈 = { 보냄: 0, 다시: 0, 멈춤: 0 };
  for (const 줄 of 집음.rows) {
    const 끝 = await 하나보내기(줄, 부르기);
    if (끝.상태 === 'SENT') {
      셈.보냄++;
      await pool.query(
        `UPDATE bts_outbox SET state = 'SENT', tries = tries + 1, last_error = NULL, issue_key = COALESCE($2, issue_key) WHERE id = $1`,
        [줄.id, 끝.issueKey ?? null],
      );
      continue;
    }
    const 그만 = 끝.상태 === 'GAVE_UP' || 줄.tries + 1 >= 최대횟수;
    if (그만) 셈.멈춤++;
    else 셈.다시++;
    await pool.query(
      `UPDATE bts_outbox
          SET tries = tries + 1, last_error = $2, state = CASE WHEN $3 THEN 'GAVE_UP' ELSE 'PENDING' END, next_at = now() + interval '1 minute'
        WHERE id = $1`,
      [줄.id, 끝.상태 === 'RETRY' && 그만 ? `${끝.까닭} — ${String(최대횟수)}번 보내고 그만뒀습니다` : 끝.까닭, 그만],
    );
  }
  return 셈;
}

/** admin 이 뜰 때 건다(app.ts 기동 경로) — buildApp 을 부르는 검사가 진짜 BTS 를 부르지 않게 */
export function 보낼줄켜기(app: FastifyInstance): void {
  const 점검 = setInterval(() => {
    void 보낼줄점검()
      .then((셈) => {
        if (셈.보냄 + 셈.다시 + 셈.멈춤 > 0) app.log.info(`[bts] 보낼 줄 — 보냄 ${String(셈.보냄)} · 다시 ${String(셈.다시)} · 멈춤 ${String(셈.멈춤)}`);
      })
      .catch((err: unknown) => app.log.error(`[bts] 보낼 줄 점검이 깨졌다: ${err instanceof Error ? err.message : String(err)}`));
  }, 60_000);
  app.addHook('onClose', async () => clearInterval(점검));
}

// BTS 로 보낼 것을 「보낼 줄」 표에 넣고 60초마다 보낸다 — 1분 간격 5번 · 4xx 는 바로 멈춤 · 재기동 뒤 이어감 (도메인/BTS 결정 17)
// 틀은 정기 실행(execution/scheduled.ts)이다. 줄이 DB 에 있어 admin 이 다시 떠도 보낼 것을 잃지 않는다

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

import { join } from 'node:path';

import { artifactsDir, 볼륨파일읽기 } from '../artifactFile.js';
import { BTS부르기, BTS올리기, type 부르기함수, type 올리기함수 } from './client.js';

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
  project_id: string;
  service_id: string | null;
  run_id: string | null;
  tc_id: string | null;
  env: string | null;
  base_url: string | null;
  bot_key: string | null;
  status_map: Record<string, string> | null;
}

/** 만들기 답의 판 번호 · 지금 상태 — 「QA 검토」로 옮길 때 쓴다 */
interface 만든이슈 {
  version: unknown;
  currentStateKey: unknown;
}

type 결과 =
  | { 상태: 'SENT'; issueKey?: string | null; 만든?: 만든이슈 }
  | { 상태: 'RETRY' | 'GAVE_UP'; 까닭: string };

// 408 · 429 는 BTS 가 잠깐 바쁜 것이라 다시 보낸다. 나머지 4xx 는 몇 번을 보내도 같은 답이라 바로 멈춘다
const 다시보낼4xx = new Set([408, 429]);

function 상태로(status: number): 결과 | null {
  if (status >= 200 && status < 300) return null;
  // 넘겨주기(redirect)를 따라가지 않는다 — 열쇠를 다른 주소로 보내지 않게. 주소가 틀린 것이라 다시 보내도 같다
  if (status >= 300 && status < 400) return { 상태: 'GAVE_UP', 까닭: `BTS 주소가 다른 곳으로 넘깁니다 — 설정의 BTS 주소를 확인하세요 (${String(status)})` };
  if (status === 401 || status === 403) return { 상태: 'GAVE_UP', 까닭: `권한 없음 — QA Hub AI 열쇠를 확인하세요 (${String(status)})` };
  if (status >= 400 && status < 500 && !다시보낼4xx.has(status)) return { 상태: 'GAVE_UP', 까닭: `BTS 가 요청을 거절했습니다 (${String(status)})` };
  return { 상태: 'RETRY', 까닭: `BTS 가 답하지 못했습니다 (${String(status)})` };
}

async function 하나보내기(줄: 집은줄, 부르기: 부르기함수): Promise<결과> {
  // 연결을 끊었으면 보낼 곳이 없다 — 줄은 남기고 멈춘다(맡은 이슈 · 짝 기록처럼)
  if (줄.base_url === null || 줄.bot_key === null) return { 상태: 'GAVE_UP', 까닭: 'BTS 연결이 없습니다' };
  if (줄.kind !== 'CREATE' && 줄.issue_key === null) return { 상태: 'GAVE_UP', 까닭: '보낼 이슈 키가 없습니다' };
  const [method, 경로] = 갈곳[줄.kind](줄.issue_key ?? '');
  // 첨부 목록은 QA Hub 몫이라 BTS 몸에서 뺀다 — 만든 뒤 따로 올린다
  const 몸 =
    줄.kind === 'CREATE' ? Object.fromEntries(Object.entries(줄.payload as Record<string, unknown>).filter(([k]) => k !== 'attachments')) : 줄.payload;
  try {
    const 자리 = { baseUrl: 줄.base_url, botKey: 줄.bot_key };
    let 보낼몸 = 몸;
    // 판 번호 없이 넣은 옮기기(재검증 통과 닫기 — deployFlow.ts) · 담당자 바꾸기(수정 AI — bugfix.ts)는 보내기 직전에 이슈의 지금 판을 읽는다 — 넣을 때 읽으면 보낼 때 낡는다
    const 판읽음 = (줄.kind === 'TRANSITION' || 줄.kind === 'ASSIGN') && (몸 as { expectedVersion?: unknown }).expectedVersion === undefined;
    if (판읽음) {
      const 읽음 = await 부르기(자리, 'GET', `/api/v1/issues/${encodeURIComponent(줄.issue_key!)}`);
      const 실패 = 상태로(읽음.status);
      if (실패 !== null) return 실패;
      const data = (읽음.json as { data?: { version?: unknown; currentStateKey?: unknown; assigneeId?: unknown } } | null)?.data;
      const { toStatusKey, comment, assigneeId } = 몸 as { toStatusKey?: unknown; comment?: unknown; assigneeId?: unknown };
      // 이미 그 사람이 담당자면 바꿀 것이 없다
      if (줄.kind === 'ASSIGN' && data?.assigneeId === assigneeId) return { 상태: 'SENT' };
      // 이미 그 상태면 옮길 것이 없다(사람이 먼저 닫았다). 실어 둔 댓글은 댓글로만 남긴다 — 재검증 통과 기록이 BTS 에 남게
      if (줄.kind === 'TRANSITION' && data?.currentStateKey === toStatusKey) {
        if (typeof comment !== 'string') return { 상태: 'SENT' };
        const 댓글 = await 부르기(자리, 'POST', 갈곳.COMMENT(줄.issue_key!)[1], { body: comment });
        return 상태로(댓글.status) ?? { 상태: 'SENT' };
      }
      if (typeof data?.version !== 'number') return { 상태: 'GAVE_UP', 까닭: `BTS 이슈 판 번호를 못 읽었습니다 (${String(읽음.status)})` };
      보낼몸 = { ...(몸 as object), expectedVersion: data.version };
    }
    const r = await 부르기(자리, method, 경로, 보낼몸);
    // 읽은 판과 보낸 사이에 누가 이슈를 고쳤다 — 다음 점검이 새 판을 읽어 다시 보낸다
    if (판읽음 && r.status === 409) return { 상태: 'RETRY', 까닭: 'BTS 이슈 판이 그사이 바뀌었습니다 (409)' };
    const 실패 = 상태로(r.status);
    if (실패 !== null) return 실패;
    if (줄.kind !== 'CREATE') return { 상태: 'SENT' };
    const data = (r.json as { data?: { key?: unknown } & Partial<만든이슈> } | null)?.data;
    const key = data?.key;
    // 키가 없으면 짝(bts_issue_case)을 못 지어 다음 실패가 이슈를 또 만든다 — 보낸 것으로 치지 않고 사람에게 보인다
    return typeof key === 'string' && key !== ''
      ? { 상태: 'SENT', issueKey: key, 만든: { version: data?.version, currentStateKey: data?.currentStateKey } }
      : { 상태: 'GAVE_UP', 까닭: `BTS 응답에 이슈 키가 없습니다 (${String(r.status)})` };
  } catch (err) {
    // ponytail: BTS 이슈 만들기에 멱등 열쇠가 없어, 만들어졌는데 답이 10초를 넘기면 다시 보낼 때 이슈가 둘 생긴다. 잦으면 다시 보내기 전에 꼬리표로 찾는다
    return { 상태: 'RETRY', 까닭: `BTS 에 닿지 않습니다 — ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * 등록이 BTS 에 닿아 짝을 적은 뒤 — 「QA 검토」로 옮기고 캡처를 올린다.
 * 옮기기 · 올리기가 깨져도 이슈는 이미 있어 다시 만들지 않는다 — 까닭을 기록에 남기고 이슈는 처음 상태로 둔다
 */
// ponytail: 옮기기 · 첨부는 한 번만 해 본다. 잦게 깨지면 보낼 줄 종류(TRANSITION · 첨부)로 넘겨 다시 보내게 한다
async function 만든뒤(줄: 집은줄, key: string, 만든: 만든이슈 | undefined, 부르기: 부르기함수, 올리기: 올리기함수): Promise<void> {
  const 자리 = { baseUrl: 줄.base_url!, botKey: 줄.bot_key! };
  const 검토 = 줄.status_map?.QA_REVIEW ?? '';
  try {
    if (검토 !== '' && typeof 만든?.version === 'number' && 만든.currentStateKey !== 검토) {
      const r = await 부르기(자리, 'POST', 갈곳.TRANSITION(key)[1], { toStatusKey: 검토, expectedVersion: 만든.version });
      if (상태로(r.status) !== null) console.error(`[bts] ${key} 를 「QA 검토」(${검토})로 옮기지 못했다 (${String(r.status)})`);
    }
  } catch (err) {
    console.error(`[bts] ${key} 를 「QA 검토」로 옮기지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
  const 첨부 = (줄.payload as { attachments?: unknown }).attachments;
  for (const 경로 of Array.isArray(첨부) ? 첨부.filter((p): p is string => typeof p === 'string') : []) {
    try {
      const 상태 = await 올리기(자리, key, 경로.split('/').join('-'), await 볼륨파일읽기(join(artifactsDir(), 경로)));
      if (상태로(상태) !== null) console.error(`[bts] ${key} 에 캡처 ${경로} 를 못 올렸다 (${String(상태)})`);
    } catch (err) {
      console.error(`[bts] ${key} 에 캡처 ${경로} 를 못 올렸다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/**
 * 때가 된 줄을 집어 보낸다. 집을 때 next_at 을 5분 뒤로 미뤄 둔다 — 보내는 사이 다음 점검이 같은 줄을 또 집지 않게.
 * 보내다 admin 이 꺼지면 5분 뒤 다시 집힌다(횟수는 그대로)
 */
export async function 보낼줄점검(
  부르기: 부르기함수 = BTS부르기,
  올리기: 올리기함수 = BTS올리기,
): Promise<{ 보냄: number; 다시: number; 멈춤: number }> {
  const pool = await db();
  const 집음 = await pool.query<집은줄>(
    `WITH 때된 AS (
       -- 같은 이슈의 앞 줄이 아직 기다리면 뒤 줄은 집지 않는다 — 다시 보낸 앞 줄이 뒤 줄보다 늦게 닿아 상태를 되돌리지 않게
       SELECT id FROM bts_outbox o
        WHERE state = 'PENDING' AND next_at <= now()
          AND NOT EXISTS (SELECT 1 FROM bts_outbox p WHERE p.state = 'PENDING' AND p.issue_key = o.issue_key AND p.id < o.id)
        ORDER BY id LIMIT 20 FOR UPDATE SKIP LOCKED
     ), 집은 AS (
       UPDATE bts_outbox o SET next_at = now() + interval '5 minutes' FROM 때된 WHERE o.id = 때된.id
       RETURNING o.id, o.project_id, o.kind, o.issue_key, o.payload, o.tries, o.service_id, o.run_id, o.tc_id, o.env
     )
     SELECT 집은.*, l.base_url, l.bot_key, l.status_map FROM 집은 LEFT JOIN bts_link l ON l.project_id = 집은.project_id ORDER BY 집은.id`,
  );
  const 셈 = { 보냄: 0, 다시: 0, 멈춤: 0 };
  for (const 줄 of 집음.rows) {
    const 끝 = await 하나보내기(줄, 부르기);
    if (끝.상태 === 'SENT') {
      셈.보냄++;
      // 보냄과 짝은 한 번에 적는다 — 그 사이에 같은 테스트가 또 실패하면 기다리는 등록도 열린 이슈도 없어 이슈가 둘 된다
      const 연결 = await pool.connect();
      try {
        await 연결.query('BEGIN');
        await 연결.query(
          `UPDATE bts_outbox SET state = 'SENT', tries = tries + 1, last_error = NULL, issue_key = COALESCE($2, issue_key) WHERE id = $1`,
          [줄.id, 끝.issueKey ?? null],
        );
        if (줄.kind === 'CREATE' && 끝.issueKey && 줄.service_id !== null && 줄.tc_id !== null && 줄.env !== null) {
          await 연결.query(
            `INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, first_run) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
            [줄.project_id, 끝.issueKey, 줄.service_id, 줄.tc_id, 줄.env, 줄.run_id],
          );
        }
        await 연결.query('COMMIT');
      } catch (err) {
        await 연결.query('ROLLBACK');
        throw new Error(`보낸 줄 ${줄.id} 을 적지 못했다(이슈 ${끝.issueKey ?? '-'} 는 BTS 에 있다): ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        연결.release();
      }
      if (줄.kind === 'CREATE' && 끝.issueKey) await 만든뒤(줄, 끝.issueKey, 끝.만든, 부르기, 올리기);
      continue;
    }
    const 그만 = 끝.상태 === 'GAVE_UP' || 줄.tries + 1 >= 최대횟수;
    if (그만) 셈.멈춤++;
    else 셈.다시++;
    await pool.query(
      `UPDATE bts_outbox
          SET tries = tries + 1, last_error = $2, state = CASE WHEN $3 THEN 'GAVE_UP' ELSE 'PENDING' END,
              -- 1분보다 조금 짧게 — 60초 점검이 보낸 직후 적은 시각이라 꼭 1분이면 다음 점검이 몇 ms 차로 놓쳐 2분 간격이 된다
              next_at = now() + interval '50 seconds'
        WHERE id = $1`,
      [줄.id, 끝.상태 === 'RETRY' && 그만 ? `${끝.까닭} — ${String(최대횟수)}번 보내고 그만뒀습니다` : 끝.까닭, 그만],
    );
  }
  return 셈;
}

/** admin 이 뜰 때 건다(app.ts 기동 경로) — buildApp 을 부르는 검사가 진짜 BTS 를 부르지 않게 */
export function 보낼줄켜기(app: FastifyInstance): void {
  // 앞 점검이 아직 돌면 건너뛴다 — 첨부 올리기로 한 번이 5분(집은 줄을 미뤄 둔 시간)을 넘으면 다음 점검이 남은 줄을 또 집어 이슈가 둘 된다
  let 도는중 = false;
  const 점검 = setInterval(() => {
    if (도는중) return;
    도는중 = true;
    void 보낼줄점검()
      .then((셈) => {
        if (셈.보냄 + 셈.다시 + 셈.멈춤 > 0) app.log.info(`[bts] 보낼 줄 — 보냄 ${String(셈.보냄)} · 다시 ${String(셈.다시)} · 멈춤 ${String(셈.멈춤)}`);
      })
      .catch((err: unknown) => app.log.error(`[bts] 보낼 줄 점검이 깨졌다: ${err instanceof Error ? err.message : String(err)}`))
      .finally(() => {
        도는중 = false;
      });
  }, 60_000);
  app.addHook('onClose', async () => clearInterval(점검));
}

// Scout 대화 · 질문 · 답 조각 · 사용량을 DB 에 읽고 쓴다 (도메인/챗봇 §3.14 · §7 · 공통/4-데이터모델 「챗봇 표」)

import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';

import { 토큰해시 } from '../auth/agentToken.js';
import { 출입증수명 } from '../auth/session.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

export type 질문상태 = 'QUEUED' | 'RUNNING' | 'DONE' | 'STOPPED' | 'TIMEOUT' | 'FAILED';
export type 단계몸 = { tool: string; ref?: string };
export type 조각 = { kind: 'TEXT'; body: string } | { kind: 'STEP' | 'STEP_DONE'; body: 단계몸 };

export const 끝난상태 = new Set<string>(['DONE', 'STOPPED', 'TIMEOUT', 'FAILED']);
/** 질문 하나의 글 상한 — 지시문 · 앞 5번과 합쳐도 AI 가 읽는 양이 한 쪽 안에 든다 (결정 16) */
export const 글최대 = 2000;

// 이어 받기(SSE)를 깨우는 신호. 깨면 DB 를 다시 읽으므로 신호가 빠져도 다음 깨움(15초)에 따라잡는다.
// ponytail: 한 프로세스 안에서만 돈다 — admin 을 여럿 띄우면 다른 프로세스의 조각은 15초 깨움으로만 보인다. 그때 LISTEN/NOTIFY 로 바꾼다
const 신호 = new EventEmitter();
신호.setMaxListeners(0);
const 질문신호 = (id: number) => `q${String(id)}`;
/** 그 질문이 바뀌었다(조각 · 상태). 대기 줄이 움직였으면 대기 중인 질문 모두를 깨운다 */
export function 알리기(ids: readonly number[], 대기도 = false): void {
  for (const id of ids) 신호.emit(질문신호(id));
  if (대기도) 신호.emit('대기');
}

/** 그 질문이 바뀌거나(대기 중이면 대기 줄이 움직이거나) ms 가 지나거나 끊기면 풀린다 */
export function 바뀜기다리기(id: number, 대기도: boolean, ms: number, 끊김: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const 이름들 = 대기도 ? [질문신호(id), '대기'] : [질문신호(id)];
    const 풀기 = () => {
      clearTimeout(시계);
      for (const 이름 of 이름들) 신호.off(이름, 풀기);
      끊김.removeEventListener('abort', 풀기);
      resolve();
    };
    const 시계 = setTimeout(풀기, ms);
    for (const 이름 of 이름들) 신호.on(이름, 풀기);
    끊김.addEventListener('abort', 풀기);
  });
}

/** 출입증 대화 키 원문 → 대화 줄의 session_key. DB 에는 해시만 둔다 */
export const 대화키해시 = (원문: string): string => 토큰해시(원문);
/** 새 대화 키 — 로그인(비밀번호 · SSO)이 출입증에 굽는다 (§3.14 「대화 수명」) */
export const 대화키새로 = (): string => randomBytes(32).toString('base64url');

/**
 * 마지막 조각(없으면 가져간 때) 뒤 2분 30초가 지난 RUNNING 을 TIMEOUT 으로 닫는다 — 작성 서버가 죽어 끝을 못 알린 질문이다.
 * 따로 도는 청소 없이 읽는 자리(대화 열기 · 이어 받기 · 집기)가 부른다 (§3.14 「2분」)
 */
export async function 멈춘질문닫기(): Promise<void> {
  const r = await (await db()).query<{ id: string }>(
    `WITH 닫음 AS (
       UPDATE chat_question SET status = 'TIMEOUT', finished_at = now(), mcp_key_hash = NULL
        WHERE status = 'RUNNING' AND COALESCE(last_chunk_at, started_at) < now() - interval '150 seconds' RETURNING id),
     사용량 AS (UPDATE chat_usage SET status = 'TIMEOUT' WHERE question_id IN (SELECT id FROM 닫음))
     SELECT id FROM 닫음`,
  );
  알리기(r.rows.map((x) => Number(x.id)));
}

/** 누구의 것이든 마지막으로 쓴 지 24시간(출입증 수명)이 지난 대화를 지운다 — 사용량은 남는다 (§3.14 「대화 수명」) */
export async function 오래된대화지우기(): Promise<void> {
  await (await db()).query('DELETE FROM chat_conversation WHERE touched_at < now() - make_interval(secs => $1)', [출입증수명]);
}

type 대화질문 = { id: number; text: string; status: 질문상태; createdAt: string; answer: string; steps: (단계몸 & { done: boolean })[]; lastSeq: number };

/** STEP 마다 한 줄. STEP_DONE 은 같은 도구의 아직 안 끝난 첫 줄을 끝낸다 — 도구를 겹쳐 불러도 차례대로 짝이 맞는다 */
function 단계들(조각들: { kind: string; body: string }[]): 대화질문['steps'] {
  const 줄들: 대화질문['steps'] = [];
  for (const c of 조각들) {
    const 몸 = JSON.parse(c.body) as 단계몸;
    if (c.kind === 'STEP') 줄들.push({ tool: 몸.tool, ...(몸.ref !== undefined && { ref: 몸.ref }), done: false });
    else {
      const 짝 = 줄들.find((s) => !s.done && s.tool === 몸.tool);
      if (짝 !== undefined) 짝.done = true;
    }
  }
  return 줄들;
}

/** 그 출입증 · 그 프로젝트의 대화. 없으면 빈 목록이고 만들지 않는다. 오래된 것부터 */
export async function 대화읽기(키해시: string, projectId: number): Promise<대화질문[]> {
  const r = await (await db()).query<{ id: string; text: string; status: 질문상태; created_at: Date; answer: string; steps: { kind: string; body: string }[]; last_seq: number }>(
    `SELECT q.id, q.text, q.status, q.created_at,
            COALESCE((SELECT string_agg(k.body, '' ORDER BY k.seq) FROM chat_chunk k WHERE k.question_id = q.id AND k.kind = 'TEXT'), '') AS answer,
            COALESCE((SELECT json_agg(json_build_object('kind', k.kind, 'body', k.body) ORDER BY k.seq) FROM chat_chunk k WHERE k.question_id = q.id AND k.kind <> 'TEXT'), '[]') AS steps,
            COALESCE((SELECT max(k.seq) FROM chat_chunk k WHERE k.question_id = q.id), 0) AS last_seq
       FROM chat_question q JOIN chat_conversation c ON c.id = q.conversation_id
      WHERE c.session_key = $1 AND c.project_id = $2
      ORDER BY q.id`,
    [키해시, projectId],
  );
  return r.rows.map((x) => ({
    id: Number(x.id),
    text: x.text,
    status: x.status,
    createdAt: x.created_at.toISOString(),
    answer: x.answer,
    steps: 단계들(x.steps),
    lastSeq: x.last_seq,
  }));
}

/** 질문을 넣는다. 대화가 없으면 만들고 있으면 쓴 시각을 고친다. 그 대화에 도는 질문이 있으면 BUSY */
export async function 질문넣기(
  키해시: string,
  projectId: number,
  username: string,
  authSid: string | null,
  text: string,
): Promise<{ id: number; ahead: number } | 'BUSY'> {
  const pool = await db();
  const 대화 = await pool.query<{ id: string }>(
    `INSERT INTO chat_conversation (session_key, project_id, username, auth_sid)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_key, project_id) DO UPDATE SET touched_at = now()
     RETURNING id`,
    [키해시, projectId, username, authSid],
  );
  let id: number;
  try {
    id = Number((await pool.query<{ id: string }>('INSERT INTO chat_question (conversation_id, text) VALUES ($1, $2) RETURNING id', [대화.rows[0]!.id, text])).rows[0]!.id);
  } catch (err) {
    // 대화마다 도는 질문은 하나다 — 부분 고유 색인(chat_question_one_open)이 막는다
    if ((err as { code?: string }).code === '23505') return 'BUSY';
    throw err;
  }
  return { id, ahead: await 앞대기수(id) };
}

async function 앞대기수(id: number): Promise<number> {
  const r = await (await db()).query<{ n: number }>(`SELECT count(*)::int AS n FROM chat_question WHERE status = 'QUEUED' AND id < $1`, [id]);
  return r.rows[0]!.n;
}

/** 그 출입증의 대화 질문이면 그 프로젝트. 아니면 null */
export async function 질문프로젝트(키해시: string, id: number): Promise<number | null> {
  const r = await (await db()).query<{ project_id: string }>(
    'SELECT c.project_id FROM chat_question q JOIN chat_conversation c ON c.id = q.conversation_id WHERE q.id = $1 AND c.session_key = $2',
    [id, 키해시],
  );
  return r.rows[0] === undefined ? null : Number(r.rows[0].project_id);
}

/** 이어 받기 한 바퀴 — 상태 · 대기 수 · 그 번호 뒤 조각. 지워진 질문이면 null. 상태를 조각보다 먼저 읽는다 — 끝난 뒤 읽은 조각은 빠짐이 없다 */
export async function 이어읽기(id: number, after: number): Promise<{ status: 질문상태; ahead: number; 조각들: ({ seq: number } & 조각)[] } | null> {
  const pool = await db();
  const 상태 = await pool.query<{ status: 질문상태 }>('SELECT status FROM chat_question WHERE id = $1', [id]);
  const status = 상태.rows[0]?.status;
  if (status === undefined) return null;
  const r = await pool.query<{ seq: number; kind: 조각['kind']; body: string }>(
    'SELECT seq, kind, body FROM chat_chunk WHERE question_id = $1 AND seq > $2 ORDER BY seq',
    [id, after],
  );
  const 조각들 = r.rows.map((x) => (x.kind === 'TEXT' ? { seq: x.seq, kind: x.kind, body: x.body } : { seq: x.seq, kind: x.kind, body: JSON.parse(x.body) as 단계몸 }));
  return { status, ahead: status === 'QUEUED' ? await 앞대기수(id) : 0, 조각들 };
}

/** QUEUED · RUNNING 이면 STOPPED 로 두고 true. 이미 끝났으면 false — 그 출입증의 질문인지는 부르는 쪽이 먼저 본다 */
export async function 질문중단(id: number): Promise<boolean> {
  const r = await (await db()).query(
    `WITH 멈춤 AS (
       UPDATE chat_question SET status = 'STOPPED', finished_at = now(), mcp_key_hash = NULL
        WHERE id = $1 AND status IN ('QUEUED', 'RUNNING') RETURNING id),
     사용량 AS (UPDATE chat_usage SET status = 'STOPPED' WHERE question_id IN (SELECT id FROM 멈춤))
     SELECT id FROM 멈춤`,
    [id],
  );
  if (r.rowCount === 0) return false;
  알리기([id], true);
  return true;
}

/** 대화를 지운다 — 질문 · 조각은 같이 지워지고 사용량은 남는다. 도는 질문의 작성 서버는 다음 조각에서 409 를 받는다 */
async function 대화들지우기(조건: string, 값: unknown[]): Promise<void> {
  // 데이터를 바꾸는 CTE 밖의 SELECT 는 지우기 전 모습을 본다 — 지운 대화의 질문 번호를 거기서 얻어 이어 받기를 깨운다
  const r = await (await db()).query<{ id: string }>(
    `WITH 지움 AS (DELETE FROM chat_conversation WHERE ${조건} RETURNING id)
     SELECT q.id FROM chat_question q WHERE q.conversation_id IN (SELECT id FROM 지움)`,
    값,
  );
  if (r.rows.length > 0) 알리기(r.rows.map((x) => Number(x.id)), true);
}

/** 대화 초기화 — 그 출입증 · 그 프로젝트 */
export const 대화지우기 = (키해시: string, projectId: number) => 대화들지우기('session_key = $1 AND project_id = $2', [키해시, projectId]);
/** 로그아웃 — 그 출입증의 대화 전부 */
export const 출입증대화지우기 = (키해시: string) => 대화들지우기('session_key = $1', [키해시]);
/** Auth back-channel — 그 Auth 세션(sid)의 대화 */
export const sid대화지우기 = (sid: string) => 대화들지우기('auth_sid = $1', [sid]);
/** Auth back-channel(sid 없이 사람 단위) — 그 사람의 대화 중 끊긴 시각(초) 전에 만든 것 */
export const 사람대화지우기 = (authSub: string, 끊긴초: number) =>
  대화들지우기('username IN (SELECT username FROM app_user WHERE auth_sub = $1) AND created_at < to_timestamp($2)', [authSub, 끊긴초]);

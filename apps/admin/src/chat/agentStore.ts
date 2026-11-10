// 작성 서버 쪽 Scout 질문 — 가져가기 · 답 조각 · 끝 알리기 (도메인/챗봇 §7 「작성 서버」 · §3.14 「돌리는 곳」)

import { randomBytes } from 'node:crypto';

import type { PoolClient } from 'pg';

import { 토큰해시 } from '../auth/agentToken.js';
import { 가져가기봄, 글최대, 멈춘질문닫기, 알리기, type 조각 } from './store.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

// AI 에게는 앞 5번 주고받은 것만 넘긴다 (결정 13)
const 앞번수 = 5;

export type 가져간질문 = { id: number; projectId: number; projectName: string; text: string; history: { q: string; a: string }[]; mcpKey: string };

/** 가장 먼저 들어온 QUEUED 하나를 RUNNING 으로 — 프로젝트를 가리지 않는다(결정 17). 키 mcq_ 는 원문을 이 답에만 싣고 해시를 질문 줄에 둔다 */
export async function 질문가져가기(claimedBy: string): Promise<가져간질문 | null> {
  가져가기봄();
  await 멈춘질문닫기();
  const 열쇠 = `mcq_${randomBytes(32).toString('base64url')}`;
  const c = await (await db()).connect();
  let 질문: 가져간질문;
  try {
    await c.query('BEGIN');
    const 집음 = await c.query<{ id: string; conversation_id: string; text: string }>(
      `UPDATE chat_question SET status = 'RUNNING', started_at = now(), claimed_by = $1, mcp_key_hash = $2
        WHERE id = (SELECT id FROM chat_question WHERE status = 'QUEUED' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
        RETURNING id, conversation_id, text`,
      [claimedBy, 토큰해시(열쇠)],
    );
    const 행 = 집음.rows[0];
    if (행 === undefined) {
      await c.query('ROLLBACK');
      return null;
    }
    질문 = await 가져간것채우기(c, Number(행.id), 행.conversation_id, 행.text, 열쇠);
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
  알리기([질문.id], true);
  return 질문;
}

async function 가져간것채우기(c: PoolClient, id: number, 대화: string, text: string, mcpKey: string): Promise<가져간질문> {
  const 머리 = await c.query<{ project_id: string; name: string; username: string }>(
    'SELECT c.project_id, p.name, c.username FROM chat_conversation c JOIN project p ON p.id = c.project_id WHERE c.id = $1',
    [대화],
  );
  const { project_id, name, username } = 머리.rows[0]!;
  // 앞 5번 — DONE 과 중단돼 답이 일부라도 있는 것. 답은 2,000자까지 (§7 claim)
  const 앞 = await c.query<{ q: string; a: string }>(
    `SELECT q.text AS q, left(COALESCE(string_agg(k.body, '' ORDER BY k.seq), ''), $3) AS a
       FROM chat_question q LEFT JOIN chat_chunk k ON k.question_id = q.id AND k.kind = 'TEXT'
      WHERE q.conversation_id = $1 AND q.id < $2 AND q.status IN ('DONE', 'STOPPED')
      GROUP BY q.id HAVING q.status = 'DONE' OR count(k.seq) > 0
      ORDER BY q.id DESC LIMIT ${String(앞번수)}`,
    [대화, id, 글최대],
  );
  // 도중에 대화가 지워져도 기록이 남게 가져갈 때 먼저 세운다 (§3.14 「토큰 기록」)
  await c.query(`INSERT INTO chat_usage (question_id, project_id, username, status) VALUES ($1, $2, $3, 'RUNNING') ON CONFLICT DO NOTHING`, [id, project_id, username]);
  return { id, projectId: Number(project_id), projectName: name, text, history: 앞.rows.reverse(), mcpKey };
}

/** 답 조각을 잇는다 — 번호는 여기서 붙인다. RUNNING 이 아니거나(중단 · 시간 초과) 지워진 질문이면 false */
export async function 조각넣기(id: number, 조각들: 조각[]): Promise<boolean> {
  const c = await (await db()).connect();
  try {
    await c.query('BEGIN');
    // 줄을 잠가 같은 질문의 조각이 겹쳐 와도 번호가 갈리지 않게 한다
    const 도는것 = await c.query(`SELECT 1 FROM chat_question WHERE id = $1 AND status = 'RUNNING' FOR UPDATE`, [id]);
    if (도는것.rowCount === 0) {
      await c.query('ROLLBACK');
      return false;
    }
    await c.query(
      `INSERT INTO chat_chunk (question_id, seq, kind, body)
       SELECT $1, (SELECT COALESCE(max(seq), 0) FROM chat_chunk WHERE question_id = $1) + t.n, t.kind, t.body
         FROM unnest($2::text[], $3::text[]) WITH ORDINALITY AS t(kind, body, n)`,
      [id, 조각들.map((x) => x.kind), 조각들.map((x) => (x.kind === 'TEXT' ? x.body : JSON.stringify(x.body)))],
    );
    await c.query('UPDATE chat_question SET last_chunk_at = now() WHERE id = $1', [id]);
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
  알리기([id]);
  return true;
}

export type 사용량 = { tokensInput: number; tokensOutput: number; tokensCacheRead: number; tokensCacheWrite: number; model: string; toolCalls: number; durationMs: number };

/**
 * 끝 알리기 — RUNNING 이면 그 상태로 닫는다. 이미 끝났거나(STOPPED · admin 이 닫은 TIMEOUT) 지워진 질문은 상태를 무시하고 사용량만 적는다.
 * 사용량 상태는 질문이 끝난 상태다(지워진 질문은 중단으로 친다). DONE 이 아니면 토큰은 끊긴 하한값이다
 */
export async function 질문끝내기(id: number, status: 'DONE' | 'TIMEOUT' | 'FAILED', error: string | null, u: 사용량): Promise<void> {
  await (await db()).query(
    `WITH 끝 AS (
       UPDATE chat_question SET status = $2, error = $3, finished_at = now(), mcp_key_hash = NULL
        WHERE id = $1 AND status = 'RUNNING' RETURNING status),
     지금 AS (SELECT COALESCE((SELECT status FROM 끝), (SELECT status FROM chat_question WHERE id = $1), 'STOPPED') AS status)
     UPDATE chat_usage SET status = 지금.status, tokens_partial = 지금.status <> 'DONE',
            tokens_input = $4, tokens_output = $5, tokens_cache_read = $6, tokens_cache_write = $7, tokens_model = $8, tool_calls = $9, duration_ms = $10
       FROM 지금 WHERE question_id = $1`,
    [id, status, error, u.tokensInput, u.tokensOutput, u.tokensCacheRead, u.tokensCacheWrite, u.model, u.toolCalls, u.durationMs],
  );
  알리기([id]);
}

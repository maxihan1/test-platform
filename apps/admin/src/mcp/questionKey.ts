// Scout 질문마다 나는 MCP 키 mcq_ — 질문을 넣은 사람의 권한을 그 질문의 프로젝트로 좁힌다 (도메인/챗봇 §3.14 결정 4 · BTS §3.12 「열쇠 표」)

import { 작성계정인가, 토큰해시 } from '../auth/agentToken.js';
import { 사용자와해시, type 사용자 } from '../auth/store.js';

export const 질문열쇠인가 = (열쇠: string): boolean => 열쇠.startsWith('mcq_');

/** Auth 에 안 묶인 사람(auth_sub 없음) — BTS 를 부르는 도구가 「QA Hub AI」 키로 넘어가지 않고 BTS_UNAUTHORIZED 를 낸다 (tools.ts BTS열기) */
export const Auth없는사람 = Symbol('Auth없는사람');

/**
 * 키 원문은 작성 서버가 질문을 가져갈 때 받는다(chat/store.ts 질문가져가기). 질문이 RUNNING 이고 마지막 조각 뒤 2분 30초 안일 때만 산다 —
 * admin 이 아직 TIMEOUT 으로 닫지 않은 멈춘 질문의 키도 받지 않는다. 묻는 사람이 꺼졌으면 null(401)
 */
export async function 질문열쇠사람(열쇠: string): Promise<{ 사람: 사용자; authSub: string | typeof Auth없는사람 } | null> {
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ username: string; auth_sub: string | null; project_id: string; claimed_by: string | null }>(
    `SELECT u.username, u.auth_sub, c.project_id, q.claimed_by
       FROM chat_question q JOIN chat_conversation c ON c.id = q.conversation_id JOIN app_user u ON u.username = c.username
      WHERE q.mcp_key_hash = $1 AND q.status = 'RUNNING' AND COALESCE(q.last_chunk_at, q.started_at) > now() - interval '150 seconds'`,
    [토큰해시(열쇠)],
  );
  const 행 = r.rows[0];
  // 가져간 작성 계정이 지금의 작성 계정이 아니면 죽은 키다 — mcj_ 와 같은 판단 (jobKey.ts)
  if (행 === undefined || 행.claimed_by === null || !작성계정인가(행.claimed_by)) return null;
  const 찾은것 = await 사용자와해시(행.username);
  if (찾은것 === null) return null;
  const projectId = Number(행.project_id);
  return {
    사람: { ...찾은것.user, mustChangePassword: false, services: 찾은것.user.services.filter((s) => s.projectId === projectId) },
    authSub: 행.auth_sub ?? Auth없는사람,
  };
}

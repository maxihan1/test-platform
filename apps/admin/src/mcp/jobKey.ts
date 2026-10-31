// 자동 AI 의 MCP 열쇠 mcj_ — 작성 요청을 집을 때 내고, 그 줄이 RUNNING 인 동안만 그 프로젝트 조회를 연다 (도메인/BTS §3.12 「열쇠 표」 · 결정 20 · BTS-F4-02)

import { randomBytes } from 'node:crypto';

import { 작성계정인가, 토큰해시 } from '../auth/agentToken.js';
import { 사용자와해시, type 사용자 } from '../auth/store.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

/**
 * 받는 줄이면 새 열쇠를 내고 해시를 그 줄에 둔다. 받는 줄이 아니면 null.
 * 받는 줄은 BTS 를 이은 프로젝트의 AUTHOR 와 원본이 AUTHOR 인 RERUN 뿐이다 — PRD_DRAFT · NOTE · BUGFIX 는 그 종류를 만드는 줄이 더한다.
 * 앞 집기의 해시는 집기(agentStore.ts)가 지운다 — 여기서 null 을 내도 옛 열쇠가 살아 있지 않다
 */
export async function 일열쇠내기(요청: { id: number; kind: string; sourceId: number | null }): Promise<string | null> {
  // 머지 · 고치기 집기마다 DB 를 한 번 더 부르지 않는다. 원본 종류와 BTS 연결은 아래 SQL 이 본다
  if (요청.kind !== 'AUTHOR' && !(요청.kind === 'RERUN' && 요청.sourceId !== null)) return null;
  const 열쇠 = `mcj_${randomBytes(32).toString('base64url')}`;
  const pool = await db();
  // 집기가 방금 RUNNING 으로 바꾼 줄이다
  const 넣음 = await pool.query(
    `UPDATE authoring_request 줄 SET mcp_key_hash = $2
       FROM service s JOIN bts_link l ON l.project_id = s.project_id
      WHERE 줄.id = $1 AND 줄.status = 'RUNNING' AND s.id = 줄.service_id
        AND (줄.kind = 'AUTHOR' OR (SELECT 원본.kind FROM authoring_request 원본 WHERE 원본.id = 줄.source_id) = 'AUTHOR')`,
    [요청.id, 토큰해시(열쇠)],
  );
  return 넣음.rowCount === 1 ? 열쇠 : null;
}

/**
 * 그 열쇠로 들어온 요청의 사람 — 집은 작성 계정의 권한을 쓰되 배정을 그 줄의 프로젝트로 좁힌다.
 * 줄이 RUNNING 이 아니거나 집은 계정이 지금의 작성 계정이 아니거나 꺼졌으면 null
 */
export async function 일열쇠사람(열쇠: string): Promise<사용자 | null> {
  const pool = await db();
  const r = await pool.query<{ claimed_by: string | null; project_id: string }>(
    `SELECT 줄.claimed_by, s.project_id FROM authoring_request 줄 JOIN service s ON s.id = 줄.service_id
      WHERE 줄.mcp_key_hash = $1 AND 줄.status = 'RUNNING'`,
    [토큰해시(열쇠)],
  );
  const 행 = r.rows[0];
  if (행 === undefined || 행.claimed_by === null || !작성계정인가(행.claimed_by)) return null;
  const 찾은것 = await 사용자와해시(행.claimed_by);
  if (찾은것 === null) return null;
  const projectId = Number(행.project_id);
  return { ...찾은것.user, mustChangePassword: false, services: 찾은것.user.services.filter((s) => s.projectId === projectId) };
}

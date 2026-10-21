// 성능 에이전트 토큰 pga_ — 사람 계정이 아니라 perf_agent 행에 매인 셋째 열쇠다 (도메인/성능 §5.4 · 도메인/인증 §7 「인증 적용 범위」)
// 서버에는 SHA-256 만 둔다. 이 토큰으로는 /api/perf/agent/** 만 열린다 — 문(auth/gate.ts)이 가른다

import { randomBytes } from 'node:crypto';

import { 토큰해시 } from '../auth/agentToken.js';

const 모양 = /^pga_[A-Za-z0-9_-]{43}$/;

export interface 성능에이전트 {
  id: number;
  name: string;
  mode: 'LOAD' | 'MONITOR';
  projectId: number | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    perfAgent: 성능에이전트 | null;
  }
}

/** 헤더가 성능 에이전트 토큰을 내밀었나 — 모양만 본다. 다른 통로에서 이것이 오면 문이 403 으로 막는다 */
export function 성능토큰인가(authorization: string | undefined): boolean {
  return authorization !== undefined && authorization.startsWith('Bearer pga_');
}

export function 성능헤더토큰(authorization: string | undefined): string | null {
  const [방식, 값, ...남음] = (authorization ?? '').split(' ');
  return 방식 === 'Bearer' && 값 !== undefined && 남음.length === 0 && 모양.test(값) ? 값 : null;
}

export function 성능토큰만들기(): { 토큰: string; 해시: string } {
  const 토큰 = `pga_${randomBytes(32).toString('base64url')}`;
  return { 토큰, 해시: 토큰해시(토큰) };
}

/** 토큰의 에이전트를 찾고 연락 시각을 고친다 — 에이전트가 부르는 모든 통로가 연락이다 (§5.4) */
export async function 성능토큰주인(토큰: string): Promise<성능에이전트 | null> {
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ id: string; name: string; mode: 'LOAD' | 'MONITOR'; project_id: string | null }>(
    'UPDATE perf_agent SET last_seen_at = now() WHERE token_hash = $1 RETURNING id, name, mode, project_id',
    [토큰해시(토큰)],
  );
  const row = r.rows[0];
  return row === undefined ? null : { id: Number(row.id), name: row.name, mode: row.mode, projectId: row.project_id === null ? null : Number(row.project_id) };
}

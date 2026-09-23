// 작성 에이전트 토큰 — 만들기 · 헤더에서 꺼내기 · 해시로 주인 찾기 · 발급·취소 (SPEC 도메인/인증 §7 「인증 적용 범위」)
// 비밀번호 대신 맥이 들고 다니는 **같은 계정의 두 번째 열쇠**다. 로그인 없이 지나가는 자리가 아니다

import { createHash, randomBytes } from 'node:crypto';

import type { Pool } from 'pg';

const 모양 = /^tpa_[A-Za-z0-9_-]{43}$/;

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/**
 * `authorization` 헤더에서 토큰을 꺼낸다. 헤더가 없으면 `null`, 있는데 모양이 아니면 `'틀림'`.
 *
 * **틀림을 `null` 과 가르는 이유** — 둘을 합치면 틀린 토큰을 든 요청이 쿠키로 넘어가 통과한다.
 * 토큰을 내민 요청은 토큰으로만 판정한다.
 */
export function 헤더토큰(authorization: string | undefined): string | null | '틀림' {
  if (authorization === undefined) return null;
  const [방식, 값, ...남음] = authorization.split(' ');
  if (방식 !== 'Bearer' || 값 === undefined || 남음.length > 0 || !모양.test(값)) return '틀림';
  return 값;
}

/**
 * 저장하는 값. **소금 없는 SHA-256 이다** — 토큰이 무작위 256비트라 사전 공격이 성립하지 않고,
 * 소금을 치면 해시로 주인을 찾을 수가 없다. 인덱스 일치로 찾으므로 글자별 시간 비교도 필요 없다
 */
export function 토큰해시(토큰: string): string {
  return createHash('sha256').update(토큰).digest('hex');
}

/** 서버가 정한 작성 에이전트 계정인가. 이름이 안 정해져 있으면 아무 계정도 아니다 */
export function 작성계정인가(username: string): boolean {
  const 정해진이름 = process.env.AUTHORING_AGENT_USER ?? '';
  return 정해진이름 !== '' && username === 정해진이름;
}

/**
 * 토큰의 주인. 비활성 계정은 없는 것으로 친다 — 세션 확인과 같은 문이다.
 * **지금의 작성 계정이 아니면 없는 것으로 친다** — 서버가 작성 계정을 바꾸면 옛 계정의 토큰이
 * 화면에서 안 보이는 채로 살아 있게 된다 (2026-09-23 검사가 잡았다)
 */
export async function 토큰주인(토큰: string): Promise<string | null> {
  const pool = await db();
  const rows = await pool.query<{ username: string }>(
    'SELECT username FROM app_user WHERE agent_token_hash = $1 AND is_active',
    [토큰해시(토큰)],
  );
  const username = rows.rows[0]?.username;
  return username !== undefined && 작성계정인가(username) ? username : null;
}

/**
 * 새 토큰을 만들어 옛것을 덮는다. **원문은 이 반환값이 유일하다** — 비밀번호와 같다 (§8.8).
 * 사람 운영 계정에 토큰이 생기지 않게 작성 에이전트 계정만 받는다
 */
export async function 에이전트토큰만들기(
  username: string,
): Promise<{ 토큰: string } | 'NOT_AUTHORING_AGENT' | 'NOT_FOUND'> {
  if (!작성계정인가(username)) return 'NOT_AUTHORING_AGENT';
  const 토큰 = `tpa_${randomBytes(32).toString('base64url')}`;
  const pool = await db();
  const rows = await pool.query('UPDATE app_user SET agent_token_hash = $2 WHERE username = $1', [
    username,
    토큰해시(토큰),
  ]);
  return rows.rowCount === 0 ? 'NOT_FOUND' : { 토큰 };
}

export async function 에이전트토큰지우기(username: string): Promise<void> {
  const pool = await db();
  await pool.query('UPDATE app_user SET agent_token_hash = NULL WHERE username = $1', [username]);
}

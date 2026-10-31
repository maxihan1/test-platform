// 통합계정 PAT 로 온 요청의 사람을 찾는다 — /mcp 한 곳만 쓴다 (도메인/BTS §3.12 「열쇠 표」 · BTS-F4-01)

import { createHash } from 'node:crypto';

import { 작성계정인가 } from './agentToken.js';
import { 토큰주인묻기, type 주인답 } from './farmToken.js';
import { SSO설정읽기 } from './oidc.js';
import { 사용자와해시, type 사용자 } from './store.js';

// BTS 와 같은 방식 — Auth whoami 답을 잠깐 기억한다. 폐기한 토큰이 이만큼은 더 산다
const 기억ms = 60_000;
const 기억 = new Map<string, { 주인: string; 까지: number }>();

export type 묻기함수 = (issuer: string, 토큰: string) => Promise<주인답>;

/** PAT 꼴인가. 사람 통로의 다른 열쇠(작성 에이전트 토큰 · cit_ · pga_)와 섞이지 않게 머리로 가른다 */
export const PAT꼴 = (토큰: string): boolean => 토큰.startsWith('pat_') && 토큰.length <= 200 && !/\s/.test(토큰);

/**
 * 그 PAT 의 주인 계정. 틀린 토큰 · 묶인 계정 없음 · 꺼진 계정은 null, Auth 에 못 닿으면 '닿지못함'.
 * 계정이 꺼졌는지는 기억과 상관없이 매번 DB 로 본다 — 끈 사람이 1분 더 들어오면 안 된다
 */
export async function PAT사람(토큰: string, 묻기: 묻기함수 = 토큰주인묻기, 지금 = Date.now()): Promise<사용자 | null | '닿지못함'> {
  const sso = SSO설정읽기();
  if (sso === null || !PAT꼴(토큰)) return null;

  const 열쇠 = createHash('sha256').update(토큰).digest('hex');
  let 주인 = 기억.get(열쇠);
  if (주인 === undefined || 주인.까지 <= 지금) {
    const 답 = await 묻기(sso.issuer, 토큰);
    if (답 === '닿지못함') return 답;
    if (답 === '틀림') {
      기억.delete(열쇠);
      return null;
    }
    주인 = { 주인: 답.주인, 까지: 지금 + 기억ms };
    // ponytail: 넘치면 통째로 비운다 — 사람 수만큼만 쌓여 1000 에 닿을 일이 드물다. 닿으면 그때 만료 순으로 지운다
    if (기억.size >= 1000) 기억.clear();
    기억.set(열쇠, 주인);
  }

  const { pool } = await import('../db/index.js');
  const { rows } = await pool.query<{ username: string }>('SELECT username FROM app_user WHERE auth_sub = $1', [주인.주인]);
  const username = rows[0]?.username;
  // 작성 에이전트 계정은 사람 열쇠로 쓰지 않는다 (identify.ts 와 같은 판단)
  if (username === undefined || 작성계정인가(username)) return null;
  const 찾은것 = await 사용자와해시(username);
  // SSO 설치라 비밀번호 바꾸기 길이 없다 (identify.ts 와 같다)
  return 찾은것 === null ? null : { ...찾은것.user, mustChangePassword: false };
}

/** 검사용 — 파일 사이에 기억이 새지 않게 */
export function PAT기억비우기(): void {
  기억.clear();
}

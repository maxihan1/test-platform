// 통합계정 PAT 로 온 요청의 사람을 찾는다 — /mcp 한 곳만 쓴다 (도메인/BTS §3.12 「열쇠 표」 · BTS-F4-01 · 대신 PAT 거절은 S25)

import { createHash } from 'node:crypto';

import { 작성계정인가 } from './agentToken.js';
import { SSO설정읽기 } from './oidc.js';
import { 사용자와해시, type 사용자 } from './store.js';

const 최대길이 = 200;
const 묻기제한ms = 10_000;

export type 주인답 = { 주인: string } | '틀림' | '닿지못함';

/** 통합계정 PAT 꼴인가 — 다른 열쇠(작성 에이전트 토큰 · cit_ · pga_ · mcj_)와 머리로 가른다 */
export const PAT꼴 = (토큰: string): boolean => 토큰.startsWith('pat_') && 토큰.length <= 최대길이 && !/\s/.test(토큰);

/**
 * Auth whoami 에 그 PAT 의 주인을 묻는다. 401 · 403 은 폐기 · 기간 끝 · 틀린 값이다.
 * **scopes 에 * 나 commander 가 없으면 틀린 것으로 친다** — Commander 가 받아 VISION · Bunker 에 싣는 대신 PAT(scopes [bunker, vision])가
 * Commander 로 돌아오지 못하게 (도메인/인증 §7 「대신 PAT」). scopes 칸이 없는 답은 S25 전 Auth 라 대신 PAT 가 없다 — 사람 PAT 로 친다
 */
export async function 토큰주인묻기(issuer: string, 토큰: string, 부르기: typeof fetch = fetch): Promise<주인답> {
  let res: Response;
  try {
    // whoami 는 Auth_platform 맨 앞 자리에 있다 — issuer 에 경로가 붙어도 그 아래가 아니다
    res = await 부르기(new URL('/api/v1/users/me/whoami', issuer), {
      headers: { authorization: `Bearer ${토큰}` },
      signal: AbortSignal.timeout(묻기제한ms),
    });
  } catch (err) {
    console.error(`[pat] Auth_platform 에 닿지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    return '닿지못함';
  }
  if (res.status === 401 || res.status === 403) return '틀림';
  const 몸 = res.ok ? ((await res.json().catch(() => null)) as { userId?: unknown; authMethod?: unknown; scopes?: unknown } | null) : null;
  if (typeof 몸?.userId !== 'string' || 몸.authMethod !== 'pat') {
    console.error(`[pat] Auth_platform whoami 답을 읽지 못했다: HTTP ${res.status}`);
    return '닿지못함';
  }
  if (몸.scopes !== undefined && !(Array.isArray(몸.scopes) && (몸.scopes.includes('*') || 몸.scopes.includes('commander')))) return '틀림';
  return { 주인: 몸.userId };
}

// BTS 와 같은 방식 — Auth whoami 답을 잠깐 기억한다. 폐기한 토큰이 이만큼은 더 산다. 틀린 답도 기억해 같은 토큰으로 Auth 를 두드리지 못하게 한다
const 기억ms = 60_000;
const 기억 = new Map<string, { 주인: string | null; 까지: number }>();

// 기억에 없는 토큰으로 Auth 에 묻는 횟수 — 한 곳에서 1분에 이만큼. 아무 pat_ 나 만들어 보내 QA Hub 가 Auth 를 대신 두드리는 길을 좁힌다
const 묻기상한 = 30;
const 묻은수 = new Map<string, { 수: number; 까지: number }>();

export type 묻기함수 = (issuer: string, 토큰: string) => Promise<주인답>;
export type PAT답 = 사용자 | null | '닿지못함' | '너무많음';

// ponytail: 넘치면 통째로 비운다 — 사람 수 · 부르는 곳 수만큼만 쌓여 1000 에 닿을 일이 드물다. 닿으면 그때 만료 순으로 지운다
function 넣기<T>(표: Map<string, T>, 열쇠: string, 값: T): void {
  if (표.size >= 1000) 표.clear();
  표.set(열쇠, 값);
}

/**
 * 그 PAT 의 주인 계정. 틀린 토큰 · 묶인 계정 없음 · 꺼진 계정은 null, Auth 에 못 닿으면 '닿지못함',
 * 그 곳(어디서)에서 1분에 묻기상한 을 넘게 새 토큰을 내밀면 '너무많음'.
 * 계정이 꺼졌는지는 기억과 상관없이 매번 DB 로 본다 — 끈 사람이 1분 더 들어오면 안 된다
 */
export async function PAT사람(토큰: string, 어디서: string, 묻기: 묻기함수 = 토큰주인묻기, 지금 = Date.now()): Promise<PAT답> {
  const sso = SSO설정읽기();
  if (sso === null || !PAT꼴(토큰)) return null;

  const 열쇠 = createHash('sha256').update(토큰).digest('hex');
  let 주인 = 기억.get(열쇠);
  if (주인 === undefined || 주인.까지 <= 지금) {
    const 센것 = 묻은수.get(어디서);
    if (센것 !== undefined && 센것.까지 > 지금 && 센것.수 >= 묻기상한) return '너무많음';
    넣기(묻은수, 어디서, 센것 !== undefined && 센것.까지 > 지금 ? { 수: 센것.수 + 1, 까지: 센것.까지 } : { 수: 1, 까지: 지금 + 기억ms });

    const 답 = await 묻기(sso.issuer, 토큰);
    if (답 === '닿지못함') return 답;
    주인 = { 주인: 답 === '틀림' ? null : 답.주인, 까지: 지금 + 기억ms };
    넣기(기억, 열쇠, 주인);
  }
  if (주인.주인 === null) return null;

  const { pool } = await import('../db/index.js');
  const { rows } = await pool.query<{ username: string }>('SELECT username FROM app_user WHERE auth_sub = $1', [주인.주인]);
  const username = rows[0]?.username;
  // 작성 에이전트 계정은 사람 열쇠로 쓰지 않는다 (identify.ts 와 같은 판단)
  if (username === undefined || 작성계정인가(username)) return null;
  const 찾은것 = await 사용자와해시(username);
  // SSO 설치라 비밀번호 바꾸기 길이 없다 (identify.ts 와 같다)
  return 찾은것 === null ? null : { ...찾은것.user, mustChangePassword: false };
}

/** 검사용 — 파일 · 검사 사이에 기억이 새지 않게 */
export function PAT기억비우기(): void {
  기억.clear();
  묻은수.clear();
}

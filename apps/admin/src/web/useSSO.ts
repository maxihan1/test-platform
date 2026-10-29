// 이 설치가 maxihan 계정(SSO)으로 로그인하는지 한 번 묻고 기억한다 · 왕복 뒤 주소의 ?sso=ok 표시를 뗀다 · 로그아웃 표시와 마지막 계정을 브라우저에 둔다 (SPEC 도메인/인증 §8.6)

import { useEffect, useState } from 'react';

import { api } from './api.js';

let 물음: Promise<boolean> | null = null;

/** 묻는 중이면 null. 물음이 실패하면 비밀번호 로그인으로 친다 — 그래야 로그인 화면이 비지 않는다 */
export function useSSO(): boolean | null {
  const [sso, setSso] = useState<boolean | null>(null);
  useEffect(() => {
    물음 ??= api.methods().then(
      (r) => r.sso,
      () => {
        물음 = null;
        return false;
      },
    );
    let 살아있음 = true;
    void 물음.then((v) => {
      if (살아있음) setSso(v);
    });
    return () => {
      살아있음 = false;
    };
  }, []);
  return sso;
}

/**
 * maxihan 계정 왕복이 막 끝났으면 서버(auth/sso.ts)가 /?sso=ok 로 보낸다. 새로고침과 가르려고 표시를 읽고 바로 지운다.
 * 참이면 막 로그인한 사람이다. 칸의 상태는 그대로 둔다 — useHash 가 먼저 적은 칸 번호를 지우면 그 칸으로 뒤로 갈 때 떠나기 막기가 앱 밖으로 내보낸다
 */
export function 막로그인표시를뗀다(): boolean {
  const 막로그인 = new URLSearchParams(window.location.search).get('sso') === 'ok';
  if (막로그인) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
  return 막로그인;
}

/**
 * 로그인 화면이 Auth_platform 으로 바로 보내지 않고 카드를 그리게 알림을 단다 (도메인/인증 §8.6).
 * `failed` — 막 돌아왔는데(`?sso=ok`) 로그인 확인이 실패했다. 안 달면 다시 보내 둘이 끝없이 오간다.
 * `out` — 로그아웃했다. 로그아웃은 Auth_platform 세션을 남기므로 안 달면 그 세션이 곧장 다시 들여보낸다
 */
export function sso알림을단다(값: 'failed' | 'out'): void {
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?sso=${값}${window.location.hash}`);
}

// 브라우저가 저장을 막아도 로그인 화면은 떠야 한다 — 읽기는 빈 값, 쓰기는 조용히 넘어간다.
// 막히면 이 탭의 `?sso=out` 만 남고 카드에 버튼 하나만 보일 뿐이다
function 읽기(키: string): string | null {
  try {
    return localStorage.getItem(키);
  } catch {
    return null;
  }
}

function 쓰기(키: string, 값: string | null): void {
  try {
    if (값 === null) localStorage.removeItem(키);
    else localStorage.setItem(키, 값);
  } catch {
    // 위와 같다
  }
}

/**
 * 로그아웃 표시 (도메인/인증 §8.6 「로그인 카드」). 주소(`?sso=out`)는 그 탭에만 남아 새 탭 · 북마크로 열면 바로 다시 들어갔다 —
 * 브라우저에 둬서 카드의 버튼을 누를 때까지 Auth_platform 으로 저절로 보내지 않는다
 */
const 로그아웃키 = '로그아웃함';

export const 로그아웃표시를단다 = (): void => 쓰기(로그아웃키, '1');
export const 로그아웃했나 = (): boolean => 읽기(로그아웃키) === '1';
export const 로그아웃표시를뗀다 = (): void => 쓰기(로그아웃키, null);

/** 마지막으로 들어온 계정 — 로그인 카드의 「이 계정으로 로그인」이 이 아이디를 Auth_platform 에 싣는다 */
export interface 기억한계정 {
  username: string;
  name: string;
}

const 계정키 = '마지막계정';

export const 계정을기억한다 = (계정: 기억한계정): void =>
  쓰기(계정키, JSON.stringify({ username: 계정.username, name: 계정.name }));
export const 기억한계정을지운다 = (): void => 쓰기(계정키, null);

export function 기억한계정을읽는다(): 기억한계정 | null {
  try {
    const 값: unknown = JSON.parse(읽기(계정키) ?? 'null');
    if (typeof 값 !== 'object' || 값 === null) return null;
    const { username, name } = 값 as Record<string, unknown>;
    return typeof username === 'string' && username !== '' && typeof name === 'string' ? { username, name } : null;
  } catch {
    // 깨진 값은 기억한 계정이 없는 것과 같다
    return null;
  }
}

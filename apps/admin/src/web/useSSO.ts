// 이 설치가 maxihan 계정(SSO)으로 로그인하는지 한 번 묻고 기억한다 · 왕복 뒤 주소의 ?sso=ok 표시를 뗀다 (SPEC 도메인/인증 §8.6)

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
 * 막 돌아왔는데(`?sso=ok`) 로그인 확인이 실패했으면 실패 알림으로 바꿔 단다. 쿠키가 막힌 브라우저 같은 때다.
 * 안 달면 로그인 화면이 알림 없이 온 것으로 보고 다시 Auth_platform 으로 보내 둘이 끝없이 오간다 (도메인/인증 §8.6)
 */
export function 왕복실패를적는다(): void {
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?sso=failed${window.location.hash}`);
}

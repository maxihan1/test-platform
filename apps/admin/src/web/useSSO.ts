// 이 설치가 maxihan 계정(SSO)으로 로그인하는지 한 번 묻고 기억한다 (SPEC 도메인/인증 §8.6)

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

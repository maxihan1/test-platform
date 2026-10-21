// 웹 애플리케이션에 앱 케이스가 있는지 읽는 훅 — 사이드바 「기기 성능」을 세울지 가른다 (도메인/러너 §5.2 종류 표 결정 6)

import { useEffect, useState } from 'react';

import { api, type ServiceRow, type User } from './api.js';
import { 종류 } from './kind.js';
import { 기능보나 } from './role.js';

/**
 * 종류 표가 APP_CASES 인 애플리케이션만 케이스 목록 첫 쪽을 읽어 `hasApp` 을 본다.
 * 케이스를 못 보는 사람 · 읽기 실패는 없는 것으로 본다 — 메뉴 하나 때문에 오류를 띄우지 않는다
 */
export function use앱케이스(user: User, service: ServiceRow | null): boolean {
  const [있음, set있음] = useState(false);
  const 읽나 = service !== null && 종류(service.kind).기기성능 === 'APP_CASES' && 기능보나(user, service.prefix, 'cases');
  const prefix = service?.prefix ?? null;

  useEffect(() => {
    set있음(false);
    if (!읽나 || prefix === null) return;
    let 낡음 = false;
    api.cases({ service: prefix }).then(
      (쪽) => {
        if (!낡음) set있음(쪽.hasApp === true);
      },
      () => undefined,
    );
    return () => {
      낡음 = true;
    };
  }, [읽나, prefix]);

  return 있음;
}

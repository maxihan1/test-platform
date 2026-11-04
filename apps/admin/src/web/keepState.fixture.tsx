// 저장 안 한 것이 있을 때 주소 이동을 막는지 보는 검사들이 나눠 쓰는 도우미 — 앱 뿌리 없이 화면만 그릴 때 use이동 을 걸어 준다 (WEB-F8-03)

import { act } from '@testing-library/react';

import { useHash } from './leaveGuard.js';

export function 주소보기() {
  return <p data-testid="hash">{useHash()}</p>;
}

/** 화면이 서 있는 주소를 정한다. 그린 뒤 이동은 이 주소에서 출발한다 */
export function 주소에선다(해시: string) {
  window.history.replaceState({ navIndex: 0 }, '', 해시);
}

/** 해시를 바꾸고 hashchange 가 처리될 때까지 기다린다 */
export async function 주소로간다(해시: string) {
  const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
  await act(async () => {
    window.location.hash = 해시;
    await 도착;
  });
}

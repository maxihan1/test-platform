// 지금 결과를 그리고 있는 실행 번호를 결과 화면이 알리고 알림 줄이 듣는 통로 (공통/5-화면공통 §8 「알림」 · 점검 2.23)
// 주소로 읽지 않는 까닭 — 실행 기록은 고른 실행을 `replaceState` 로 적어 `hashchange` 가 안 오고, 주소에 `run=` 이 없어도 첫 줄을 결과 칸에 그린다

import { useEffect, useState } from 'react';

const 바뀜 = 'tp:viewed-run';
let 보는실행: number | null = null;

export function 보는실행알림(runId: number | null): void {
  보는실행 = runId;
  window.dispatchEvent(new Event(바뀜));
}

/** 결과 화면이 그리는 동안 그 실행 번호를 알린다. 화면이 내려가면 지운다 */
export function use보는실행알림(runId: number): void {
  useEffect(() => {
    보는실행알림(runId);
    return () => 보는실행알림(null);
  }, [runId]);
}

export function use보는실행(): number | null {
  const [값, set값] = useState(보는실행);
  useEffect(() => {
    const 다시읽는다 = () => set값(보는실행);
    window.addEventListener(바뀜, 다시읽는다);
    다시읽는다();
    return () => window.removeEventListener(바뀜, 다시읽는다);
  }, []);
  return 값;
}

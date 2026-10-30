// 진행 창을 연 실행을 화면을 옮겨도 기억하는 자리 — 진행 알약 · 진행 창(RunWatch)이 이것을 본다 (도메인/실행 §8.9 「진행 상자를 닫으면 진행 알약으로 줄어든다」)
// 새로고침해도 알약이 남아야 끝났을 때 완료 창을 받는다. 탭 하나의 일이라 sessionStorage 에 번호만 둔다

import { useEffect, useState } from 'react';

const 키 = 'tp:watch-run';
const 바뀜 = 'tp:watch-run';

export interface 지켜봄 {
  runId: number;
  /** 진행 창이 열려 있나. 닫혀 있으면 알약이다. 새로고침하면 알약으로 돌아온다 */
  열림: boolean;
}

function 저장값(): 지켜봄 | null {
  try {
    const runId = Number(sessionStorage.getItem(키));
    return Number.isInteger(runId) && runId > 0 ? { runId, 열림: false } : null;
  } catch {
    // 저장소를 막은 창이다 — 새로고침 뒤에만 알약을 잃는다
    return null;
  }
}

let 지금: 지켜봄 | null = 저장값();

export function 지켜본다(값: 지켜봄 | null): void {
  지금 = 값;
  try {
    if (값 === null) sessionStorage.removeItem(키);
    else sessionStorage.setItem(키, String(값.runId));
  } catch {
    // 위와 같다 — 이 탭 안에서는 그대로 남는다
  }
  window.dispatchEvent(new Event(바뀜));
}

export function 지켜보는실행(): 지켜봄 | null {
  return 지금;
}

export function use지켜봄(): 지켜봄 | null {
  const [값, set값] = useState(지금);
  useEffect(() => {
    const 다시읽는다 = () => set값(지금);
    window.addEventListener(바뀜, 다시읽는다);
    다시읽는다();
    return () => window.removeEventListener(바뀜, 다시읽는다);
  }, []);
  return 값;
}

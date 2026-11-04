// 마법사 단계를 주소 `?step=` 에 담는 훅 — 단계를 넘기면 기록을 쌓고, 뒤로 · 앞으로 가기는 이 훅이 들어 단계만 옮긴다

import { useEffect, useRef } from 'react';

import { 스스로듣기, 조건붙인주소, 주소고치기, 주소쌓기, 주소조건 } from './leaveGuard.js';
import { route } from './route.js';

/**
 * 뒤로 가기 = 앞 단계가 되게 한다. 앱 뿌리가 화면을 다시 그리면 쓰던 값을 잃으므로, 이 훅이 서 있는 동안 뿌리는 같은 화면 안
 * 뒤로 · 앞으로 가기에 다시 그리지도, 떠나기를 묻지도 않는다(leaveGuard 의 스스로듣기)
 * @param 지금 화면이 든 단계
 * @param 옮기기 주소가 다른 단계를 가리키면 불린다 — 화면 쪽이 갈 수 있는 범위로 줄여 받는다
 * @param 첫단계 주소에 적지 않는 단계. 새로고침하면 마법사는 늘 첫 단계에서 다시 시작하므로, 열린 주소에 다른 단계가 있으면 지운다
 */
export function use단계주소(지금: number, 옮기기: (단계: number) => void, 첫단계 = 0): void {
  const 최신 = useRef({ 지금, 옮기기, 화면: route(window.location.hash).name });
  최신.current.지금 = 지금;
  최신.current.옮기기 = 옮기기;
  const 처음 = useRef(true);
  const 듣고옴 = useRef(false);

  useEffect(() => 스스로듣기(), []);

  useEffect(() => {
    const 경로 = window.location.hash.split('?')[0]!;
    // 해시 주소가 아니면(주소 없이 그려 본 검사) 적을 곳이 없다
    if (!경로.startsWith('#/')) return;
    const 주소 = 조건붙인주소(경로, 지금 === 첫단계 ? {} : { step: String(지금) });
    const 쌓나 = !처음.current && !듣고옴.current;
    처음.current = false;
    듣고옴.current = false;
    최신.current.화면 = route(window.location.hash).name;
    (쌓나 ? 주소쌓기 : 주소고치기)(주소);
  }, [지금, 첫단계]);

  useEffect(() => {
    const 들음 = () => {
      // 다른 화면으로 가는 중이면 그 주소의 step 은 우리 것이 아니다
      if (route(window.location.hash).name !== 최신.current.화면) return;
      const 글 = 주소조건().get('step');
      const 단계 = 글 === null ? 첫단계 : Number(글);
      if (!Number.isInteger(단계) || 단계 === 최신.current.지금) return;
      듣고옴.current = true;
      최신.current.옮기기(단계);
    };
    window.addEventListener('hashchange', 들음);
    return () => window.removeEventListener('hashchange', 들음);
  }, [첫단계]);
}

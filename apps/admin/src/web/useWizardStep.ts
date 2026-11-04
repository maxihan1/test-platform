// 마법사 단계를 주소 `?step=` 에 담는 훅 — 단계를 넘기면 기록을 쌓고, 뒤로 · 앞으로 가기는 이 훅이 들어 단계만 옮긴다

import { useEffect, useRef } from 'react';

import { 스스로듣기, 조건붙인주소, 주소고치기, 주소쌓기, 주소조건 } from './leaveGuard.js';
import { route } from './route.js';

const 지금경로 = () => window.location.hash.split('?')[0]!;
// 같은 화면인지 가르는 열쇠. 알 수 없는 주소는 route 가 해시 통째로 돌려주니 경로만 쓴다
const 화면열쇠 = (): string => {
  const r = route(window.location.hash);
  return r.name === 'unknown' ? `unknown:${지금경로()}` : JSON.stringify(r);
};

// 다른 칸(저장한 번호 등)은 두고 step 만 바꾼다
function 단계주소(단계: number, 첫단계: number): string {
  const 조건 = Object.fromEntries(주소조건());
  delete 조건.step;
  return 조건붙인주소(지금경로(), 단계 === 첫단계 ? 조건 : { ...조건, step: String(단계) });
}

/**
 * 뒤로 가기 = 앞 단계가 되게 한다. 앱 뿌리가 화면을 다시 그리면 쓰던 값을 잃으므로, 이 훅이 서 있는 동안 뿌리는 같은 화면 안
 * 뒤로 · 앞으로 가기에 다시 그리지도, 떠나기를 묻지도 않는다(leaveGuard 의 스스로듣기)
 * @param 지금 화면이 든 단계
 * @param 옮기기 주소가 다른 단계를 가리키면 불린다. 화면 쪽이 단계 검사를 거쳐 실제로 간 단계를 돌려준다 —
 * 뒤로는 그대로 가고 앞으로는 검사를 통과하는 데까지만 간다. 주소는 실제 단계로 덮어쓴다
 * @param 함께듣는칸 `step` 말고 이 마법사가 주소에 적어 두는 칸(예: 저장한 시나리오 번호). 뒤로 가기에 이 칸이 달라도 같은 화면 안 이동으로 본다
 * @param 첫단계 주소에 적지 않는 단계. 새로고침하면 마법사는 늘 첫 단계에서 다시 시작하므로, 열린 주소에 다른 단계가 있으면 지운다
 * @returns 마법사가 스스로 단계를 옮길 때(검사 실패로 되돌리기 · 서버 오류) 그 단계 바꿈 앞에 부르는 표시 — 그 한 번은 쌓지 않고 덮어쓴다
 */
export function use단계주소(지금: number, 옮기기: (단계: number) => number, 첫단계 = 0, 함께듣는칸: readonly string[] = []): (단계: number) => void {
  const 최신 = useRef({ 지금, 옮기기, 화면: 화면열쇠() });
  최신.current.지금 = 지금;
  최신.current.옮기기 = 옮기기;
  const 처음 = useRef(true);
  const 덮을단계 = useRef<number | null>(null);

  useEffect(() => 스스로듣기(['step', ...함께듣는칸]), []);

  useEffect(() => {
    // 해시 주소가 아니면(주소 없이 그려 본 검사) 적을 곳이 없다
    if (!지금경로().startsWith('#/')) return;
    const 주소 = 단계주소(지금, 첫단계);
    const 쌓나 = !처음.current && 덮을단계.current !== 지금;
    처음.current = false;
    덮을단계.current = null;
    최신.current.화면 = 화면열쇠();
    (쌓나 ? 주소쌓기 : 주소고치기)(주소);
  }, [지금, 첫단계]);

  useEffect(() => {
    const 들음 = () => {
      // 다른 화면으로 가는 중이면 그 주소의 step 은 우리 것이 아니다
      if (화면열쇠() !== 최신.current.화면) return;
      const 글 = 주소조건().get('step');
      const 단계 = 글 === null ? 첫단계 : Number(글);
      if (!Number.isInteger(단계) || 단계 === 최신.current.지금) return;
      const 간곳 = 최신.current.옮기기(단계);
      // 검사에 걸려 단계가 안 바뀌면 [지금] 효과가 안 도니 여기서 주소를 실제 단계로 고친다
      if (간곳 === 최신.current.지금) 주소고치기(단계주소(간곳, 첫단계));
      else 덮을단계.current = 간곳;
    };
    window.addEventListener('hashchange', 들음);
    return () => window.removeEventListener('hashchange', 들음);
  }, [첫단계]);

  return (단계) => {
    if (단계 !== 최신.current.지금) 덮을단계.current = 단계;
  };
}

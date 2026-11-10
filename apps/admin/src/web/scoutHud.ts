// Scout 레이더 버튼 끌기 — 5px 넘게 움직이면 옮기고, 놓으면 가까운 가장자리에 붙이고, 자리를 PC · 휴대폰 따로 기억한다 (도메인/챗봇 §8.18 「HUD 버튼」)

import { useEffect, useRef, useState, type PointerEvent } from 'react';

/** 버튼이 붙은 쪽과 버튼 아래 끝에서 창 아래까지의 거리(px). 아래 탭 · 진행 알약 위로 올리는 일은 CSS 가 한다(scoutHud.css) */
export type Hud자리 = { 쪽: 'left' | 'right'; y: number };

const 크기 = 56;
const 끌기문턱 = 5;
const 열쇠 = (휴대폰: boolean) => (휴대폰 ? 'scout-hud:phone' : 'scout-hud:pc');

/** 놓은 자리에서 가까운 가장자리. 높이는 그대로 둔다 */
export function 붙일자리(왼쪽: number, 위: number, 창폭: number, 창높이: number): Hud자리 {
  return { 쪽: 왼쪽 + 크기 / 2 < 창폭 / 2 ? 'left' : 'right', y: Math.max(0, Math.round(창높이 - 위 - 크기)) };
}

// 저장소는 사생활 창 · 막힌 사이트 데이터에서 던지거나 비어 온다 — 그때는 처음 자리(오른쪽 아래)다
export function 자리읽기(휴대폰: boolean): Hud자리 | null {
  try {
    const 값: unknown = JSON.parse(localStorage.getItem(열쇠(휴대폰)) ?? 'null');
    if (typeof 값 !== 'object' || 값 === null) return null;
    const { 쪽, y } = 값 as Record<string, unknown>;
    return (쪽 === 'left' || 쪽 === 'right') && typeof y === 'number' && Number.isFinite(y) ? { 쪽, y: Math.max(0, y) } : null;
  } catch {
    return null;
  }
}

function 자리쓰기(휴대폰: boolean, 자리: Hud자리): void {
  try {
    localStorage.setItem(열쇠(휴대폰), JSON.stringify(자리));
  } catch {
    // 못 적으면 이번 화면에서만 그 자리에 있다 — 다시 열면 처음 자리다
  }
}

const 사이 = (값: number, 아래: number, 위: number) => Math.min(Math.max(값, 아래), Math.max(아래, 위));

/** 창이 열려 있는 동안(`막힘`)은 옮기지 않는다 — 창이 버튼 자리에 붙어 있어서다 */
export function useHud끌기(휴대폰: boolean, 막힘: boolean) {
  const [자리, set자리] = useState(자리읽기(휴대폰));
  const [끄는곳, set끄는곳] = useState<{ x: number; y: number } | null>(null);
  // 마지막 자리를 ref 에도 둔다 — 마지막 움직임과 놓기가 한 번에 오면 state 는 아직 앞 값이다
  const 잡음 = useRef<{ x: number; y: number; dx: number; dy: number; 곳: { x: number; y: number } | null } | null>(null);
  const 방금끌었다 = useRef(false);

  // 창을 좁혀 PC ↔ 휴대폰이 바뀌면 그쪽에 기억한 자리로 옮긴다
  useEffect(() => set자리(자리읽기(휴대폰)), [휴대폰]);

  const 놓기 = () => {
    const 잡은 = 잡음.current;
    잡음.current = null;
    if (잡은?.곳 == null) return;
    const 새 = 붙일자리(잡은.곳.x, 잡은.곳.y, window.innerWidth, window.innerHeight);
    set자리(새);
    자리쓰기(휴대폰, 새);
    set끄는곳(null);
    방금끌었다.current = true;
  };

  const 손잡이 = {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (막힘 || e.button !== 0) return;
      const 상자 = e.currentTarget.getBoundingClientRect();
      잡음.current = { x: e.clientX, y: e.clientY, dx: e.clientX - 상자.left, dy: e.clientY - 상자.top, 곳: null };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
      const 잡은 = 잡음.current;
      if (잡은 === null) return;
      if (잡은.곳 === null && Math.hypot(e.clientX - 잡은.x, e.clientY - 잡은.y) <= 끌기문턱) return;
      잡은.곳 = { x: 사이(e.clientX - 잡은.dx, 0, window.innerWidth - 크기), y: 사이(e.clientY - 잡은.dy, 0, window.innerHeight - 크기) };
      set끄는곳(잡은.곳);
    },
    onPointerUp: 놓기,
    onPointerCancel: () => {
      잡음.current = null;
      set끄는곳(null);
    },
  };

  /** 끈 뒤 따라오는 click 은 열기가 아니다. 한 번 읽으면 지운다 */
  const 끈뒤클릭 = () => {
    const 그랬다 = 방금끌었다.current;
    방금끌었다.current = false;
    return 그랬다;
  };

  return { 자리, 끄는곳, 손잡이, 끈뒤클릭 };
}

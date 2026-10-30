// 휴대폰 아래 판 — 손잡이를 끌어 내리거나 바깥을 누르면 닫힌다 (DESIGN.md 「휴대폰의 창」 · SPEC 공통/5-화면공통 §8 「휴대폰 화면」)

import { useEffect, useRef, useState } from 'react';

/** 이만큼 끌어 내리면 닫는다. 덜 끌면 제자리로 돌아간다 */
const 닫는거리 = 80;

/**
 * 손잡이 끌기. 판 전체가 아니라 손잡이만 듣는다 — 판 안의 목록을 내리려던 손가락이 판을 닫으면 안 된다.
 * 돌려주는 `판` 스타일을 판에 걸면 끄는 동안 손가락을 따라 내려온다
 */
export function use끌어닫기(onClose: () => void) {
  const [아래로, set아래로] = useState(0);
  const 시작 = useRef<number | null>(null);
  return {
    손잡이: {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        시작.current = e.clientY;
        // 손가락이 손잡이 밖으로 나가도 계속 듣는다. jsdom 에는 없다
        e.currentTarget.setPointerCapture?.(e.pointerId);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (시작.current !== null) set아래로(Math.max(0, e.clientY - 시작.current));
      },
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
        if (시작.current === null) return;
        const 끈거리 = e.clientY - 시작.current;
        시작.current = null;
        set아래로(0);
        if (끈거리 >= 닫는거리) onClose();
      },
      onPointerCancel: () => {
        시작.current = null;
        set아래로(0);
      },
    },
    판: 아래로 === 0 ? undefined : { transform: `translateY(${아래로}px)`, transition: 'none' },
  };
}

/** 손잡이 막대. 읽기 프로그램에는 뜻이 없다 — 닫는 길은 바깥 누르기 · Esc · 판 안 단추다 */
export function 손잡이({ 끌기 }: { 끌기: ReturnType<typeof use끌어닫기> }) {
  return <div className="sheet-grab" aria-hidden="true" {...끌기.손잡이} />;
}

/**
 * 아래에서 올라오는 판 하나. 뒤를 덮고, 바깥 · Esc · 손잡이로 닫힌다.
 * 메뉴판 · 애플리케이션 고르기 · 내 메뉴처럼 고르면 닫히는 판에 쓴다. 값을 넣는 창은 Modal 이다
 */
export function 아래판({ 제목, onClose, children }: { 제목: string; onClose: () => void; children: React.ReactNode }) {
  const 끌기 = use끌어닫기(onClose);
  const 판 = useRef<HTMLDivElement>(null);
  const 닫기 = useRef(onClose);
  닫기.current = onClose;

  useEffect(() => {
    const 연곳 = document.activeElement;
    판.current?.focus();
    const 누름 = (e: KeyboardEvent) => {
      if (e.key === 'Escape') 닫기.current();
    };
    document.addEventListener('keydown', 누름);
    return () => {
      document.removeEventListener('keydown', 누름);
      // 판을 연 단추로 포커스를 돌려준다 — 판과 같이 사라지면 키보드 자리를 잃는다
      if (연곳 instanceof HTMLElement && 연곳.isConnected) 연곳.focus();
    };
  }, []);

  return (
    <div
      className="sheet-back"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={판} className="sheet" role="dialog" aria-modal="true" aria-label={제목} tabIndex={-1} style={끌기.판}>
        <손잡이 끌기={끌기} />
        {children}
      </div>
    </div>
  );
}

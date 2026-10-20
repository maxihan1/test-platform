// 오른쪽에서 미끄러져 들어오는 서랍 — 뒤를 어둡게 하지 않는 패널. 알림 서랍과 같은 움직임 · 닫는 길이다 (DESIGN.md 「모달」)

import { useEffect, useRef, useState } from 'react';

import { 상자열렸나 } from './Modal.js';

interface Props {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export function Drawer({ onClose, children, className, ...속성 }: Props) {
  const 서랍 = useRef<HTMLElement>(null);
  // 연 자리는 그리기 전에 잡는다 — 서랍으로 옮긴 포커스가 아니라 누른 단추가 잡혀야 돌려줄 수 있다
  const [연곳] = useState(() => document.activeElement);

  // 모달이 아니라 포커스를 가두지 않는다. 다만 열면 서랍으로 들어가야 키보드만 쓰는 사람이 서랍을 찾는다
  useEffect(() => {
    서랍.current?.focus();
    return () => {
      // 서랍 안에 있던 포커스는 서랍과 같이 사라져 body 로 간다 — 그때만 연 자리로 돌려준다.
      // 다른 줄을 눌러 서랍을 바꿔 열면 포커스는 그 줄에 있으니 건드리지 않는다
      const 지금 = document.activeElement;
      if ((지금 === null || 지금 === document.body) && 연곳 instanceof HTMLElement) 연곳.focus();
    };
  }, []);

  useEffect(() => {
    const 누름 = (e: KeyboardEvent) => {
      // 서랍 안에서 연 상자(실행 창 같은)가 떠 있으면 Esc 는 그 상자 몫이다
      if (e.key === 'Escape' && !상자열렸나()) onClose();
    };
    document.addEventListener('keydown', 누름);
    return () => document.removeEventListener('keydown', 누름);
  }, [onClose]);

  return (
    <aside ref={서랍} tabIndex={-1} className={className === undefined ? 'drawer' : `drawer ${className}`} {...속성}>
      {children}
    </aside>
  );
}

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

  // 모달이 아니라 포커스를 가두지 않는다. 다만 사람이 눌러 열었으면 서랍으로 들어가야 키보드만 쓰는 사람이 서랍을 찾는다.
  // 주소로 다시 열린 것(연 자리가 body)은 포커스를 빼앗지 않는다
  useEffect(() => {
    if (연곳 instanceof HTMLElement && 연곳 !== document.body) 서랍.current?.focus();
    return () => {
      // 서랍 안에 있던 포커스는 서랍과 같이 사라져 body 로 간다 — 그때만 연 자리로 돌려준다.
      // 다른 줄을 눌러 서랍을 바꿔 열면 포커스는 그 줄에 있으니 건드리지 않는다
      const 지금 = document.activeElement;
      if ((지금 === null || 지금 === document.body) && 연곳 instanceof HTMLElement) 연곳.focus();
    };
  }, []);

  // 듣기는 열 때 한 번만 건다 — onClose 가 바뀔 때마다 다시 걸면 서랍 안에서 연 상자보다 뒤로 밀려,
  // 상자가 먼저 닫히고 나서 이쪽이 「상자 없음」을 보고 서랍까지 닫는다
  const 닫기 = useRef(onClose);
  닫기.current = onClose;
  useEffect(() => {
    const 누름 = (e: KeyboardEvent) => {
      // 서랍 안에서 연 상자(실행 창 같은)나 위에 뜬 알림 서랍이 있으면 Esc 는 그쪽 몫이다
      if (e.key === 'Escape' && !상자열렸나() && document.getElementById('nt-drawer') === null) 닫기.current();
    };
    document.addEventListener('keydown', 누름);
    return () => document.removeEventListener('keydown', 누름);
  }, []);

  return (
    <aside ref={서랍} tabIndex={-1} className={className === undefined ? 'drawer' : `drawer ${className}`} {...속성}>
      {children}
    </aside>
  );
}

// 모달 한 조각 (DESIGN.md). 되돌릴 수 없는 일을 하기 전 확인(SPEC §8.3)과
// 실행 완료 알림(§8.9) 두 자리에만 쓴다. 그 밖의 알림·안내·오류는 화면 안의 줄로 적는다

import { useEffect, useRef } from 'react';

interface Props {
  제목: string;
  onClose: () => void;
  children: React.ReactNode;
  /** 아래쪽 버튼들. 오른쪽 끝이 주 동작이다 */
  버튼: React.ReactNode;
}

/** 포커스를 가둘 때 훑을 것들 */
const 포커스가능 = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({ 제목, onClose, children, 버튼 }: Props) {
  const 상자 = useRef<HTMLDivElement>(null);
  // 닫으면 열기 전 있던 자리로 돌려준다 (DESIGN.md)
  const 열기전 = useRef<Element | null>(null);

  useEffect(() => {
    열기전.current = document.activeElement;
    상자.current?.querySelector<HTMLElement>(포커스가능)?.focus();

    return () => {
      if (열기전.current instanceof HTMLElement) 열기전.current.focus();
    };
  }, []);

  useEffect(() => {
    function 눌림(e: KeyboardEvent) {
      // 닫는 길 셋 중 하나 (DESIGN.md)
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // 포커스를 모달 안에 가둔다. 밖으로 나가면 뒤 화면을 조작하게 된다
      const 것들 = [...(상자.current?.querySelectorAll<HTMLElement>(포커스가능) ?? [])];
      if (것들.length === 0) return;
      const 처음 = 것들[0]!;
      const 끝 = 것들[것들.length - 1]!;

      if (!e.shiftKey && document.activeElement === 끝) {
        e.preventDefault();
        처음.focus();
      } else if (e.shiftKey && document.activeElement === 처음) {
        e.preventDefault();
        끝.focus();
      }
    }

    document.addEventListener('keydown', 눌림);
    return () => document.removeEventListener('keydown', 눌림);
  }, [onClose]);

  return (
    // 뒤 화면은 잉크색 40% 로 덮는다. 흐리게(blur) 처리하지 않는다 (DESIGN.md)
    <div
      className="modal-back"
      onMouseDown={(e) => {
        // 바깥 누르기 — 닫는 길 셋 중 하나. 상자 안에서 시작한 드래그는 세지 않는다
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={제목} ref={상자}>
        <div className="modal-title">{제목}</div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{버튼}</div>
      </div>
    </div>
  );
}

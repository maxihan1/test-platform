// 모달 한 조각. 쓰는 자리는 DESIGN.md 「모달」의 목록뿐이다 — 개수를 여기 적지 않는다(두 자리라 적힌 채 늘었다).
// 그 밖의 알림·안내·오류는 화면 안의 줄로 적는다

import { useEffect, useRef } from 'react';

interface Props {
  제목: string;
  onClose: () => void;
  children: React.ReactNode;
  /** 아래쪽 버튼들. 오른쪽 끝이 주 동작이다 */
  버튼: React.ReactNode;
  /** 표가 들어가 480px 에 안 들어가는 상자 (DESIGN.md 「②의 상자 둘」). 880px 로 연다 */
  넓게?: boolean;
  /**
   * 뒷막을 눌러 닫을지. 끄면 뒷막은 무시하고 Escape·취소 버튼은 그대로 닫는다.
   * 값을 많이 고친 창을 빗나간 클릭 하나로 잃지 않게 한다
   */
  바깥눌러닫기?: boolean;
}

/** 열려 있는 상자들, 나중에 열린 것이 뒤. Esc 한 번이 겹친 상자를 한꺼번에 닫지 않게 맨 위만 반응하려고 둔다 */
const 열린상자들: symbol[] = [];

/** 서랍(Drawer)이 Esc 를 상자에 양보하려고 묻는다 */
export function 상자열렸나(): boolean {
  return 열린상자들.length > 0;
}

/** 포커스를 가둘 때 훑을 것들. 화면 전체를 덮는 설정 마법사도 같은 것으로 가둔다 */
export const 포커스가능 = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({ 제목, onClose, children, 버튼, 넓게 = false, 바깥눌러닫기 = true }: Props) {
  const 상자 = useRef<HTMLDivElement>(null);
  // 닫으면 열기 전 있던 자리로 돌려준다 (DESIGN.md)
  const 열기전 = useRef<Element | null>(null);
  const 나 = useRef(Symbol('modal'));

  useEffect(() => {
    열기전.current = document.activeElement;
    // 되돌릴 수 없는 버튼이 앞에 서는 상자는 첫 포커스를 `data-first` 로 옮긴다 — Enter 한 번에 그쪽으로 가지 않게
    (상자.current?.querySelector<HTMLElement>('[data-first]') ?? 상자.current?.querySelector<HTMLElement>(포커스가능))?.focus();
    const 내표 = 나.current;
    열린상자들.push(내표);

    return () => {
      열린상자들.splice(열린상자들.indexOf(내표), 1);
      if (열기전.current instanceof HTMLElement) 열기전.current.focus();
    };
  }, []);

  useEffect(() => {
    function 눌림(e: KeyboardEvent) {
      // 닫는 길 셋 중 하나 (DESIGN.md)
      if (e.key === 'Escape') {
        if (열린상자들[열린상자들.length - 1] === 나.current) onClose();
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
        if (바깥눌러닫기 && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={넓게 ? 'modal wide' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-label={제목}
        ref={상자}
      >
        <div className="modal-title">{제목}</div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{버튼}</div>
      </div>
    </div>
  );
}

// 모달 한 조각. 쓰는 자리는 DESIGN.md 「모달」의 목록뿐이다 — 개수를 여기 적지 않는다(두 자리라 적힌 채 늘었다).
// 그 밖의 알림·안내·오류는 화면 안의 줄로 적는다

import { useEffect, useRef } from 'react';

import { use말 } from './i18n.js';
import { use휴대폰 } from './phone.js';
import { 손잡이, use끌어닫기 } from './Sheet.js';

interface Props {
  제목: string;
  onClose: () => void;
  children: React.ReactNode;
  /** 아래쪽 버튼들. 오른쪽 끝이 주 동작이다 */
  버튼: React.ReactNode;
  /**
   * 실행 창 한 틀의 지금 단계 (도메인/실행 §8.16). 주면 1180×744 고정 창이 되고 머리에 단계 표시와 닫기 × 가 선다 —
   * 단계가 바뀌어도 창 크기와 단추 자리가 그대로다 (점검표 D1 · D5)
   */
  틀?: 틀단계;
  /**
   * 뒷막을 눌러 닫을지. 끄면 뒷막은 무시하고 Escape·취소 버튼은 그대로 닫는다.
   * 값을 많이 고친 창을 빗나간 클릭 하나로 잃지 않게 한다
   */
  바깥눌러닫기?: boolean;
}

export type 틀단계 = '준비' | '실행 중' | '결과';
const 틀단계들: 틀단계[] = ['준비', '실행 중', '결과'];

/** 열려 있는 상자들, 나중에 열린 것이 뒤. Esc 한 번이 겹친 상자를 한꺼번에 닫지 않게 맨 위만 반응하려고 둔다 */
const 열린상자들: symbol[] = [];

/** 서랍(Drawer)이 Esc 를 상자에 양보하려고 묻는다 */
export function 상자열렸나(): boolean {
  return 열린상자들.length > 0;
}

/** 포커스를 가둘 때 훑을 것들. 화면 전체를 덮는 설정 마법사도 같은 것으로 가둔다 */
export const 포커스가능 = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({ 제목, onClose, children, 버튼, 틀, 바깥눌러닫기 = true }: Props) {
  const t = use말();
  const 상자 = useRef<HTMLDivElement>(null);
  // 닫으면 열기 전 있던 자리로 돌려준다 (DESIGN.md)
  const 열기전 = useRef<Element | null>(null);
  const 나 = useRef(Symbol('modal'));
  // 휴대폰에서 작은 창은 손잡이로 끌어 닫는 아래 판, 값을 넣는 창(바깥 누르기로 안 닫히는 창)은 전체 화면이다 (DESIGN.md 「휴대폰의 창」)
  const 휴대폰 = use휴대폰();
  const 끌기 = use끌어닫기(onClose);
  const 아래판 = 휴대폰 && 바깥눌러닫기;

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
        className={['modal', 틀 === undefined ? '' : 'frame', 휴대폰 && !바깥눌러닫기 ? 'full' : ''].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={제목}
        ref={상자}
        style={아래판 ? 끌기.판 : undefined}
      >
        {아래판 ? <손잡이 끌기={끌기} /> : null}
        {틀 === undefined ? (
          <div className="modal-title">{제목}</div>
        ) : (
          <div className="modal-title frame-head">
            <span className="frame-title">{제목}</span>
            {/* 지금 단계만 진하게. 진행 · 결과에서 연 창도 같은 머리다 */}
            <ol className="frame-steps" aria-label={t('단계')}>
              {틀단계들.map((단계) => (
                <li key={단계} aria-current={단계 === 틀 ? 'step' : undefined}>
                  <span>{t(단계)}</span>
                </li>
              ))}
            </ol>
            {/* 앞 판은 Esc 로만 닫혔다. 바닥 단추 「닫기」와 이름이 겹치지 않게 「창 닫기」다 */}
            <button type="button" className="frame-x" aria-label={t('창 닫기')} onClick={onClose}>
              ×
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{버튼}</div>
      </div>
    </div>
  );
}

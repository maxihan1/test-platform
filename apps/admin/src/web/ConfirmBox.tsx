// 되돌리기 어려운 동작 앞에서 한 번 묻는 작은 상자와, 저장 전 줄을 그 자리에서 두 번 눌러 지우는 단추 (DESIGN.md 「모달」 ①)

import { useState, type ReactNode } from 'react';

import { use말 } from './i18n.js';
import { Modal } from './Modal.js';

/** 쓰는 자리는 DESIGN.md 「모달」 ① 「되돌리기 어려운 동작 전 확인」 목록뿐이다 */
export function 확인창({ 제목, 확인, 막힘 = false, onClose, on확인, children }: { 제목: string; 확인: string; 막힘?: boolean; onClose: () => void; on확인: () => void; children: ReactNode }) {
  const t = use말();
  return (
    <Modal
      제목={제목}
      onClose={onClose}
      버튼={
        <>
          {/* 첫 포커스는 취소다 — 열자마자 Enter 한 번에 그 일이 되지 않게 */}
          <button type="button" className="btn ghost" onClick={onClose} data-first>
            {t('취소')}
          </button>
          <button type="button" className="btn" disabled={막힘} onClick={on확인}>
            {확인}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

/**
 * 「삭제」 → 「삭제 확인」. 저장하지 않은 줄이라 상자를 열지 않는다.
 * 줄을 차례 번호로 그리는 표에서는 key 로 줄 내용을 준다 — 앞줄이 빠지면 확인 상태가 다른 줄로 옮겨 간다
 */
export function 두번삭제({ 라벨, 모양 = 'btn ghost small', on삭제 }: { 라벨: string; 모양?: string; on삭제: () => void }) {
  const t = use말();
  const [확인, set확인] = useState(false);
  return (
    <button
      type="button"
      className={확인 ? `${모양} set-warn` : 모양}
      aria-label={확인 ? `${라벨} · ${t('삭제 확인')}` : 라벨}
      onBlur={() => set확인(false)}
      onClick={(e) => {
        // 더블클릭의 두 번째 누름은 세지 않는다 — 한 번 누른 것과 같다
        if (확인) {
          if (e.detail > 1) return;
          // 빠진 줄과 내용이 같은 다음 줄이 이 자리를 이어받으면 확인 상태가 남는다
          set확인(false);
          on삭제();
          return;
        }
        // Safari 는 단추를 눌러도 포커스를 안 줘서, 다른 데를 눌러도 확인이 안 풀린다
        e.currentTarget.focus();
        set확인(true);
      }}
    >
      {확인 ? t('삭제 확인') : t('삭제')}
    </button>
  );
}

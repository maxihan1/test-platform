// 목록 왼쪽 기능 묶음 목차 — PRD 관리 요구사항 · 테스트 실행 두 목록이 같이 쓴다 (도메인/작성 §8.x 「목차」 · 도메인/카탈로그 §8.1 「목차」)
// 펼치고 접던 묶음 머리를 걷어 낸 자리다(2026-11-11 시안 B). 휴대폰에서는 목록 위 가로 칩 줄이 된다(listToc.css)

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { use말 } from './i18n.js';

export interface 목차칸 {
  열쇠: string;
  이름: string;
  건수: number;
  실패: number;
  /** 목차 규칙에 어긋난 까닭 — 있으면 아래쪽에 「정리 필요」를 달고 따로 모은다 */
  정리?: string | null;
}

/** 묶음 칸 하나가 목차의 한 줄과 짝이 되는 표시. 목록의 묶음 덩어리(<section>)에 단다 */
export const 목차자리 = (열쇠: string) => ({ 'data-toc': 열쇠 });

/** 묶음 이름표가 붙어야 할 높이 — 상자 맨 위에 붙어 서는 칸 이름 줄(.rowhead)을 비켜 선다 */
const 머리높이 = (상자: HTMLElement) => 상자.querySelector<HTMLElement>(':scope > .rowhead')?.offsetHeight ?? 0;
const 묶음칸들 = (상자: HTMLElement) => [...상자.querySelectorAll<HTMLElement>('[data-toc]')];

/**
 * 스크롤 상자에서 지금 보는 묶음과 그 묶음으로 가기.
 * 지금 묶음은 이름표가 상자 맨 위(칸 이름 줄 아래)를 지난 마지막 묶음이다. 아직 아무것도 안 지났으면 첫 묶음이다
 */
export function use목차위치(상자: RefObject<HTMLElement | null>, 다시: unknown) {
  const [지금, set지금] = useState<string | null>(null);
  // 목차에서 마지막으로 누른 묶음 — 끝 가까운 묶음은 바닥까지 굴려도 이름표가 맨 위에 못 닿아 위 묶음이 지금으로 잡혔다(2026-11-11 미리보기)
  const 누른 = useRef<string | null>(null);
  useEffect(() => {
    const el = 상자.current;
    if (el === null) return;
    const 재기 = () => {
      const 머리 = 머리높이(el);
      el.style.setProperty('--toc-top', `${String(머리)}px`);
      // 휴대폰에서는 상자가 아니라 페이지가 구른다 — 상자 위가 화면 밖으로 나가면 화면 맨 위를 선으로 쓴다
      const 상자위 = el.getBoundingClientRect().top;
      const 선 = Math.max(상자위, 0) + 머리 + 4;
      const 칸들 = 묶음칸들(el);
      let 찾음 = 칸들[0]?.dataset.toc ?? null;
      for (const 칸 of 칸들) {
        if (칸.getBoundingClientRect().top > 선) break;
        찾음 = 칸.dataset.toc ?? null;
      }
      // 바닥에 닿았고 누른 묶음이 보이면 그 묶음이 지금이다
      const 바닥 = el.scrollHeight > el.clientHeight + 1 && el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      const 누른칸 = 칸들.find((칸) => 칸.dataset.toc === 누른.current);
      if (바닥 && 누른칸 !== undefined && 누른칸.getBoundingClientRect().top < 상자위 + el.clientHeight) 찾음 = 누른.current;
      set지금(찾음);
    };
    재기();
    // 스크롤은 거품이 안 올라 잡기로 듣는다 — 상자든 페이지든 구르면 다시 잰다
    document.addEventListener('scroll', 재기, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', 재기, { capture: true });
  }, [상자, 다시]);

  /** 그 묶음이 지금 그려져 있으면 상자를 굴려 맨 위에 세우고 true. 없으면(아직 안 받은 쪽) false */
  const 가기 = useCallback(
    (열쇠: string): boolean => {
      const el = 상자.current;
      const 칸 = el === null ? undefined : 묶음칸들(el).find((x) => x.dataset.toc === 열쇠);
      if (el === null || 칸 === undefined) return false;
      누른.current = 열쇠;
      // 상자가 안 구르면(휴대폰 — 페이지가 구른다) 페이지를 굴린다
      if (el.scrollHeight > el.clientHeight + 1) el.scrollTop += 칸.getBoundingClientRect().top - el.getBoundingClientRect().top - 머리높이(el);
      else 칸.scrollIntoView?.({ block: 'start' });
      set지금(열쇠);
      return true;
    },
    [상자],
  );
  return { 지금, 가기 };
}

/** 묶음이 둘 이상일 때만 선다 — 하나뿐이면 목차가 할 일이 없다(목차 규칙 5) */
export function 묶음목차({ 칸들, 지금, on가기, on정리 }: { 칸들: 목차칸[]; 지금: string | null; on가기: (열쇠: string) => void; on정리?: (열쇠: string) => void }) {
  const t = use말();
  if (칸들.length < 2) return null;
  const 바른 = 칸들.filter((칸) => !칸.정리);
  const 정리할 = 칸들.filter((칸) => 칸.정리);
  const 줄 = (칸: 목차칸) => (
    <button
      key={칸.열쇠}
      type="button"
      className="toc-item"
      aria-current={지금 === 칸.열쇠 ? 'true' : undefined}
      title={칸.정리 ? `${칸.이름} — ${칸.정리}` : 칸.이름}
      onClick={() => {
        on가기(칸.열쇠);
        if (칸.정리 && on정리 !== undefined) on정리(칸.열쇠);
      }}
    >
      <span className="toc-name">{칸.이름}</span>
      {칸.실패 === 0 ? null : <span className="toc-fail">{t('실패 {건수}', { 건수: 칸.실패 })}</span>}
      {칸.정리 ? <span className="toc-fix">{t('정리 필요')}</span> : null}
      <span className="toc-count">{칸.건수}</span>
    </button>
  );
  return (
    <nav className="toc" aria-label={t('기능 묶음 목차')}>
      {바른.map(줄)}
      {정리할.length === 0 ? null : (
        <>
          <span className="toc-sep" role="separator" />
          {정리할.map(줄)}
        </>
      )}
    </nav>
  );
}

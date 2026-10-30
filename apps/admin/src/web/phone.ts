// 창이 휴대폰 폭인지 가르고, 휴대폰에서 표를 카드 줄로 읽히게 칸 이름을 붙인다 (SPEC 공통/5-화면공통 §8 「휴대폰 화면」)

import { useSyncExternalStore } from 'react';

/**
 * styles.css 의 `@media (max-width: 620px)` 와 같은 기준이다. 기기를 따로 알아내지 않는다 —
 * 둘이 어긋나면 CSS 는 휴대폰 배치인데 화면은 PC 껍데기를 그린다
 */
export const 휴대폰기준 = '(max-width: 620px)';

// jsdom · 아주 옛 브라우저에는 matchMedia 가 없다. 그때는 PC 로 본다
function 미디어(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(휴대폰기준) : null;
}

function 구독(알림: () => void): () => void {
  const 질의 = 미디어();
  질의?.addEventListener('change', 알림);
  return () => 질의?.removeEventListener('change', 알림);
}

/** 창을 좁히거나 넓히면 그 자리에서 껍데기가 바뀐다 */
export function use휴대폰(): boolean {
  return useSyncExternalStore(구독, () => 미디어()?.matches ?? false);
}

/**
 * 휴대폰은 표를 카드 줄로 쌓는다 — 칸 이름 줄을 숨기므로 칸마다 그 이름을 `data-label` 로 붙여 둔다(phone.css 가 앞에 적는다).
 * 화면마다 라벨을 따로 적지 않고 표머리에서 읽는다. 이름이 빈 칸(체크 · ▶ 같은)은 붙이지 않는다 —
 * 값만으로 뜻이 서는 칸이다 (화면공통 §8 「휴대폰 화면」 「표는 카드 줄이다」 · DESIGN.md 「반응형」)
 */
export function 표에라벨을단다(그릇: ParentNode): void {
  for (const 표 of 그릇.querySelectorAll('table')) {
    const 머리 = [...표.querySelectorAll('thead tr:last-child th')].map((칸) => 칸.textContent?.trim() ?? '');
    if (머리.length === 0) continue;
    for (const 줄 of 표.querySelectorAll('tbody tr')) {
      let 자리 = 0;
      for (const 칸 of 줄.children) {
        const 이름 = 머리[자리] ?? '';
        if (이름 !== '' && 칸.getAttribute('data-label') !== 이름) 칸.setAttribute('data-label', 이름);
        자리 += 칸 instanceof HTMLTableCellElement ? 칸.colSpan : 1;
      }
    }
  }
}

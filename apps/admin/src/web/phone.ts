// 창이 휴대폰 폭인지와 휴대폰에서 여는 자리인지를 가른다 (SPEC 공통/5-화면공통 §8 「휴대폰 화면」)

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
 * 휴대폰에서 여는 자리인가. `지금자리()` 가 돌려준 해시로 가른다 — 실행 결과 · 항목 상세는 `#/runs` 다.
 * 나머지(케이스 · PRD · 작성 · 시나리오 · 설정)는 PC 전용 안내를 그린다
 */
export function 휴대폰자리인가(지금: string): boolean {
  return 지금 === '#/dashboard' || 지금 === '#/password' || 지금 === '#/runs' || 지금.startsWith('#/runs/');
}

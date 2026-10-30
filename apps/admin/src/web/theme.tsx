// 밝게 · 어둡게 — 고른 것을 브라우저에 남기고 <html data-theme> 에 건다 (DESIGN.md 「두 벌 토큰」 · 화면공통 §8 「껍데기」 바닥)
// 고른 것이 없으면 data-theme 을 달지 않는다 — 그때는 styles.css 의 prefers-color-scheme 이 컴퓨터 설정을 따른다

import { useState } from 'react';

import { use말 } from './i18n.js';
import { 아이콘 } from './icons.js';

export type 밝기 = 'light' | 'dark';

const 밝기키 = 'theme';

export function 고른밝기(): 밝기 | null {
  try {
    const 값 = localStorage.getItem(밝기키);
    return 값 === 'light' || 값 === 'dark' ? 값 : null;
  } catch {
    // 브라우저가 저장을 막아도 화면은 떠야 한다. 컴퓨터 설정을 따를 뿐이다
    return null;
  }
}

/** 지금 보이는 벌. 고른 것이 없으면 컴퓨터 설정이다 */
export function 지금밝기(): 밝기 {
  return 고른밝기() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches === true ? 'dark' : 'light');
}

/** 첫 그리기 전에 부른다 — 고른 것이 있을 때만 건다 */
// ponytail: main.tsx 에서 건다. 고른 벌이 컴퓨터 설정과 다르면 빌드 화면에서 첫 장면이 잠깐 반대 벌일 수 있다 — 거슬리면 index.html 머리에 같은 몇 줄을 옮긴다
export function 고른밝기를건다(): void {
  const 값 = 고른밝기();
  if (값 !== null) document.documentElement.dataset.theme = 값;
}

function 밝기를적는다(값: 밝기): void {
  document.documentElement.dataset.theme = 값;
  try {
    localStorage.setItem(밝기키, 값);
  } catch {
    // 위와 같다 — 이번 화면에서만 바뀐다
  }
}

/** 사이드바 바닥 단추. 지금 아닌 쪽 아이콘을 보인다(어둡게면 해) */
export function 밝기단추() {
  const t = use말();
  const [지금, set지금] = useState(지금밝기);
  const 다음: 밝기 = 지금 === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="theme-btn"
      aria-label={다음 === 'light' ? t('밝게 보기') : t('어둡게 보기')}
      title={다음 === 'light' ? t('밝게 보기') : t('어둡게 보기')}
      onClick={() => {
        밝기를적는다(다음);
        set지금(다음);
      }}
    >
      <아이콘 이름={다음 === 'light' ? 'sun' : 'moon'} />
    </button>
  );
}

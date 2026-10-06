// E2E 시나리오 조립 화면 오른쪽의 탭 틀 — 탭 줄 · 화살표 이동 · 탭 칸. 탭 속은 화면이 children 으로 넣는다 (도메인/시나리오 §8.11)

import type { KeyboardEvent, ReactNode } from 'react';

import { use말 } from './i18n.js';

// 값이 영어인 이유 — 따옴표 안의 한국어는 messages.test 가 화면 글자로 읽어 번역표에 키를 요구한다. 탭 이름표는 화면에 안 나가는 식별자다
export type 조립탭 = 'settings' | 'add' | 'trial' | 'history';

const 탭아이디 = (탭: 조립탭) => `scn-tab-${탭}`;
const 칸아이디 = 'scn-tabpanel';

export function ScenarioTabs({
  탭,
  on탭,
  고른번호,
  쓰나,
  이력있나,
  children,
}: {
  탭: 조립탭;
  on탭: (탭: 조립탭) => void;
  고른번호: number | null;
  쓰나: boolean;
  이력있나: boolean;
  children?: ReactNode;
}) {
  const t = use말();
  const 보이는: { 값: 조립탭; 글: string }[] = [
    ...(고른번호 === null ? [] : [{ 값: 'settings' as const, 글: t('{번호}번 설정', { 번호: 고른번호 })}]),
    ...(쓰나 ? [{ 값: 'add' as const, 글: t('단계 추가') }, { 값: 'trial' as const, 글: t('시험 결과') }] : []),
    ...(이력있나 ? [{ 값: 'history' as const, 글: t('변경 이력') }] : []),
  ];
  // 고른 카드를 빼는 것처럼 지금 탭이 사라져도 빈 칸을 그리지 않는다
  const 지금 = 보이는.some((x) => x.값 === 탭) ? 탭 : 보이는[0]?.값;

  function 키누름(e: KeyboardEvent, 자리: number) {
    const 방향 = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (방향 === 0) return;
    e.preventDefault();
    const 다음 = 보이는[(자리 + 방향 + 보이는.length) % 보이는.length];
    if (다음 === undefined) return;
    on탭(다음.값);
    document.getElementById(탭아이디(다음.값))?.focus();
  }

  return (
    <>
      <div role="tablist" className="scn-tabs">
        {보이는.map((x, i) => (
          <button
            key={x.값}
            type="button"
            role="tab"
            id={탭아이디(x.값)}
            className="scn-tab"
            aria-selected={x.값 === 지금}
            aria-controls={칸아이디}
            tabIndex={x.값 === 지금 ? 0 : -1}
            onClick={() => on탭(x.값)}
            onKeyDown={(e) => 키누름(e, i)}
          >
            {x.글}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={칸아이디}
        className="scn-tabpanel"
        aria-labelledby={지금 === undefined ? undefined : 탭아이디(지금)}
      >
        {children}
      </div>
    </>
  );
}

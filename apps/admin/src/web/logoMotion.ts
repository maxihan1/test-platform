// 사이드바 로고 움직임(체크 · 글자 · 밑줄)을 마우스를 올릴 때 처음부터 다시 돌린다 (화면공통 §8 「껍데기」 맨 위 줄 · 2026-11-02 사용자)

/** rail.css 의 로고 움직임 이름들 — 여기 든 것만 다시 돌린다 */
const 로고움직임 = new Set(['logo-check', 'logo-slide', 'logo-line']);

/**
 * 움직임 이름을 바꿔 끼우는 CSS 만으로는 마우스를 뗄 때 또 돈다 — 그래서 돌던 움직임을 직접 처음으로 되감는다.
 * 움직임 줄이기를 켰으면 움직임이 없어 아무것도 안 한다
 */
export function 로고움직임다시(문서: Pick<Document, 'getAnimations'> = document): void {
  if (typeof 문서.getAnimations !== 'function') return;
  for (const a of 문서.getAnimations()) {
    const 이름 = (a as Animation & { animationName?: string }).animationName;
    if (이름 === undefined || !로고움직임.has(이름)) continue;
    a.cancel();
    a.play();
  }
}

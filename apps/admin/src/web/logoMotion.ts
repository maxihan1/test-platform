// 사이드바 로고 움직임(체크 · 글자 · 밑줄)을 마우스를 올릴 때 처음부터 다시 돌린다 (화면공통 §8 「껍데기」 맨 위 줄 · 2026-11-02 사용자)

/** rail.css 의 로고 움직임 이름들 — 여기 든 것만 다시 돌린다 */
const 로고움직임 = new Set(['logo-check', 'logo-slide', 'logo-line']);

type 움직임 = Animation & { animationName?: string };
type 품 = { getAnimations?: (o?: GetAnimationsOptions) => Animation[] };

/**
 * 움직임 이름을 바꿔 끼우는 CSS 만으로는 마우스를 뗄 때 또 돈다 — 그래서 돌던 움직임을 직접 처음으로 되감는다.
 * 로고 두 곳(사이드바 로고 글자 · 왼쪽 줄 마크) 안의 움직임만 본다 — 문서 전체를 훑지 않는다.
 * **체크 · 글자가 아직 도는 중이면 다시 시작하지 않는다** — 로고 위를 오가며 지날 때마다 글자가 사라졌다 나타나 깜빡였다(코드 리뷰).
 * 밑줄만 흐려지는 중일 때는 막지 않는다 — 밑줄은 글자보다 1초 넘게 더 돌아 그동안 마우스 올림이 먹히지 않았다
 * 움직임 줄이기를 켰으면 움직임이 없어 아무것도 안 한다
 */
export function 로고움직임다시(문서: Pick<Document, 'querySelectorAll'> = document): void {
  const 것들: 움직임[] = [];
  for (const el of 문서.querySelectorAll('.side-logo, .rail-logo')) {
    const 꼴 = el as unknown as 품;
    if (typeof 꼴.getAnimations !== 'function') continue;
    for (const a of 꼴.getAnimations({ subtree: true }) as 움직임[]) {
      if (a.animationName !== undefined && 로고움직임.has(a.animationName)) 것들.push(a);
    }
  }
  if (것들.some((a) => a.animationName !== 'logo-line' && a.playState === 'running')) return;
  for (const a of 것들) {
    a.cancel();
    a.play();
  }
}

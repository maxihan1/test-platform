// 화면 전체에 한 번 거는 움직임 — 하나만 고르는 칩의 고른 면 미끄러짐 · 화면 이동 교차 페이드 (⑬-7, DESIGN 원칙 4)

import { flushSync } from 'react-dom';

function 줄이기(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** 한 번의 렌더에서 같은 묶음 안의 칩 하나가 꺼지고 하나가 켜졌으면 그 둘. 여러 개를 고르는 칩은 하나씩 바뀌어 안 걸린다 */
export function 옮긴칩(기록들: Pick<MutationRecord, 'target' | 'oldValue'>[]): [Element, Element][] {
  const 꺼진 = new Map<Element, Element>();
  const 켜진: Element[] = [];
  for (const r of 기록들) {
    const 칩 = r.target as Element;
    if (!칩.classList.contains('chip') || 칩.parentElement === null) continue;
    const 지금 = 칩.getAttribute('aria-pressed');
    if (r.oldValue === 'true' && 지금 === 'false') 꺼진.set(칩.parentElement, 칩);
    if (r.oldValue === 'false' && 지금 === 'true') 켜진.push(칩);
  }
  return 켜진.flatMap((칩) => {
    const 앞 = 꺼진.get(칩.parentElement!);
    return 앞 === undefined ? [] : [[앞, 칩] as [Element, Element]];
  });
}

// 고른 면을 앞 칩 자리에서 새 칩 자리로 미끄러뜨린다. 면은 칩 위에 뜨지만 lighten 으로 섞여 칩 글자가 비친다.
// 오는 동안 새 칩은 안 고른 모양(chip-arriving)이라 면이 둘로 안 보인다
function 미끄러뜨린다(앞: Element, 새: Element): void {
  const a = 앞.getBoundingClientRect();
  const b = 새.getBoundingClientRect();
  const 뿌리 = getComputedStyle(document.documentElement);
  const 시간 = Number.parseFloat(뿌리.getPropertyValue('--dur')) * 1000;
  const 면 = document.createElement('div');
  면.className = 'chip-face';
  Object.assign(면.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
  document.body.append(면);
  새.classList.add('chip-arriving');
  const 끝 = () => {
    면.remove();
    새.classList.remove('chip-arriving');
  };
  면
    .animate([{ transform: `translateX(${a.left - b.left}px) scaleX(${a.width / b.width})` }, { transform: 'none' }], {
      duration: 시간,
      easing: 뿌리.getPropertyValue('--ease').trim(),
    })
    .finished.then(끝, 끝);
}

// ponytail: main.tsx 에서 한 번만 부른다. 칩마다 훅을 달지 않고 aria-pressed 가 바뀌는 것을 문서 하나에서 본다
export function 칩움직임을건다(): void {
  if (typeof MutationObserver === 'undefined' || typeof Element.prototype.animate !== 'function') return;
  new MutationObserver((기록들) => {
    if (줄이기()) return;
    for (const [앞, 새] of 옮긴칩(기록들)) 미끄러뜨린다(앞, 새);
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'], attributeOldValue: true });
}

/** 다른 화면으로 옮길 때만 교차 페이드로 바꾼다. 같은 화면의 거르기(? 뒤)만 바뀌면 그냥 바꾼다 */
export function 화면을바꾼다(앞: string, 새: string, 바꾼다: () => void): void {
  const 길 = (h: string) => h.split('?')[0];
  if (길(앞) === 길(새) || typeof document.startViewTransition !== 'function' || 줄이기()) return 바꾼다();
  document.startViewTransition(() => flushSync(바꾼다));
}

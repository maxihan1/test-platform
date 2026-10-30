// 화면 전체에 한 번 거는 움직임 — 칩 고른 면 · 탭 밑줄 · 애플리케이션 막대 미끄러짐 · 휴대폰 깊이 이동 (⑬-7 · WEB-F7-05, DESIGN 원칙 4)

import { flushSync } from 'react-dom';

import { 휴대폰기준 } from './phone.js';

function 줄이기(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

type 상자 = { left: number; top: number; width: number; height: number };

/**
 * 하나만 켜지는 표시의 종류. 켜진 칸이 바뀌면 그 표시를 앞 칸 자리에서 새 칸 자리로 옮긴다.
 * `면` 은 칸 상자에서 표시가 그려지는 자리 — 칩은 칸 전체, 탭은 아래 2px 밑줄, 애플리케이션은 왼쪽 3px 막대(rail.css)다
 */
const 표시들: { 속성: string; 맞나: (칸: Element) => boolean; 켜짐: string; 면: (r: 상자) => 상자; 이름: string }[] = [
  { 속성: 'aria-pressed', 맞나: (칸) => 칸.classList.contains('chip'), 켜짐: 'true', 면: (r) => r, 이름: 'chip' },
  {
    속성: 'aria-selected',
    맞나: (칸) => 칸.matches('.trace-tab, .scn-tab'),
    켜짐: 'true',
    면: (r) => ({ left: r.left, top: r.top + r.height - 2, width: r.width, height: 2 }),
    이름: 'tab',
  },
  {
    속성: 'aria-current',
    맞나: (칸) => 칸.classList.contains('rail-app'),
    켜짐: 'page',
    면: (r) => ({ left: r.left - 6, top: r.top + 10, width: 3, height: r.height - 20 }),
    이름: 'rail',
  },
];

/** 한 번의 렌더에서 같은 묶음 안의 칸 하나가 꺼지고 하나가 켜졌으면 그 둘. 여러 개를 고르는 칩은 하나씩 바뀌어 안 걸린다 */
export function 옮긴칸(기록들: Pick<MutationRecord, 'target' | 'oldValue' | 'attributeName'>[]): [Element, Element, string][] {
  const 꺼진 = new Map<Element, Element>();
  const 켜진: [Element, string][] = [];
  for (const r of 기록들) {
    const 칸 = r.target as Element;
    const 표시 = 표시들.find((x) => x.속성 === r.attributeName);
    if (표시 === undefined || !표시.맞나(칸) || 칸.parentElement === null) continue;
    const 앞켜짐 = r.oldValue === 표시.켜짐;
    const 지금켜짐 = 칸.getAttribute(표시.속성) === 표시.켜짐;
    if (앞켜짐 && !지금켜짐) 꺼진.set(칸.parentElement, 칸);
    if (!앞켜짐 && 지금켜짐) 켜진.push([칸, 표시.이름]);
  }
  return 켜진.flatMap(([칸, 이름]) => {
    const 앞 = 꺼진.get(칸.parentElement!);
    return 앞 === undefined ? [] : [[앞, 칸, 이름] as [Element, Element, string]];
  });
}

// 표시를 앞 칸 자리에서 새 칸 자리로 미끄러뜨린다. 오는 동안 새 칸은 제 표시를 감춘다(*-arriving) — 표시가 둘로 안 보이게.
// 칩 면은 칩 위에 뜨지만 lighten 으로 섞여 칩 글자가 비친다
function 미끄러뜨린다(앞: Element, 새: Element, 이름: string): void {
  const 면 = 표시들.find((x) => x.이름 === 이름)!.면;
  const a = 면(앞.getBoundingClientRect());
  const b = 면(새.getBoundingClientRect());
  const 뿌리 = getComputedStyle(document.documentElement);
  const 판 = document.createElement('div');
  판.className = `${이름}-face`;
  Object.assign(판.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
  document.body.append(판);
  새.classList.add(`${이름}-arriving`);
  const 끝 = () => {
    판.remove();
    새.classList.remove(`${이름}-arriving`);
  };
  판
    .animate(
      [{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})` }, { transform: 'none' }],
      { duration: Number.parseFloat(뿌리.getPropertyValue('--t2')) * 1000, easing: 뿌리.getPropertyValue('--ease').trim() },
    )
    .finished.then(끝, 끝);
}

// ponytail: main.tsx 에서 한 번만 부른다. 칸마다 훅을 달지 않고 켜짐 속성이 바뀌는 것을 문서 하나에서 본다
export function 칩움직임을건다(): void {
  if (typeof MutationObserver === 'undefined' || typeof Element.prototype.animate !== 'function') return;
  new MutationObserver((기록들) => {
    if (줄이기()) return;
    for (const [앞, 새, 이름] of 옮긴칸(기록들)) 미끄러뜨린다(앞, 새, 이름);
  }).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: 표시들.map((x) => x.속성),
    attributeOldValue: true,
  });
}

const 길 = (h: string) => h.split('?')[0]!;

/** 목록에서 그 아래 상세로 들어가나 — `#/cases` → `#/cases/ABC-001` */
export function 더깊다(앞: string, 새: string): boolean {
  return 길(새).startsWith(`${길(앞)}/`);
}

/**
 * 화면을 바꾼다. 새 화면의 판은 CSS 등장(styles.css 「화면 열기」)으로 차례로 떠오른다.
 * 휴대폰에서 상세로 들어갈 때만 새 화면이 오른쪽에서 밀려 들어온다 — 판을 transform 으로 밀면 그 안의 모달이 잘려(원칙 4) 화면 사진(View Transitions)을 민다
 */
export function 화면을바꾼다(앞: string, 새: string, 바꾼다: () => void): void {
  if (!더깊다(앞, 새) || window.matchMedia?.(휴대폰기준).matches !== true || typeof document.startViewTransition !== 'function' || 줄이기()) return 바꾼다();
  const 뿌리 = document.documentElement;
  뿌리.dataset.move = 'deeper';
  document.startViewTransition(() => flushSync(바꾼다)).finished.finally(() => delete 뿌리.dataset.move);
}

/** 밝게 · 어둡게 — 화면 전체가 겹쳐 바뀐다 */
export function 겹쳐바꾼다(바꾼다: () => void): void {
  if (typeof document.startViewTransition !== 'function' || 줄이기()) return 바꾼다();
  document.startViewTransition(() => flushSync(바꾼다));
}

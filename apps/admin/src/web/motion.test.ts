// @vitest-environment jsdom
// 미끄러짐이 어느 두 칸 사이에서 도는지 고르는 순수 부분과 깊이 이동 판정을 본다
import { describe, expect, it } from 'vitest';

import { 더깊다, 옮긴칸 } from './motion.js';

function 묶음(...눌림: boolean[]): HTMLElement[] {
  const 칸 = document.createElement('div');
  return 눌림.map((x) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.setAttribute('aria-pressed', String(x));
    칸.append(b);
    return b;
  });
}

const 눌림 = (target: Element, oldValue: string | null) => ({ target, oldValue, attributeName: 'aria-pressed' });

describe('옮긴칸', () => {
  it('같은 묶음에서 칩 하나가 꺼지고 하나가 켜지면 그 둘을 앞 → 새 차례로 준다', () => {
    const [a, b] = 묶음(false, true);
    expect(옮긴칸([눌림(a!, 'true'), 눌림(b!, 'false')])).toEqual([[a, b, 'chip']]);
  });

  it('여러 개를 고르는 칩처럼 켜지기만 하면 움직이지 않는다', () => {
    const [, b] = 묶음(true, true);
    expect(옮긴칸([눌림(b!, 'false')])).toEqual([]);
  });

  it('다른 묶음의 칩끼리는 짝짓지 않는다', () => {
    const [a] = 묶음(false);
    const [b] = 묶음(true);
    expect(옮긴칸([눌림(a!, 'true'), 눌림(b!, 'false')])).toEqual([]);
  });

  it('칩이 아닌 단추는 보지 않는다', () => {
    const [a, b] = 묶음(false, true);
    a!.className = 'btn';
    b!.className = 'btn';
    expect(옮긴칸([눌림(a!, 'true'), 눌림(b!, 'false')])).toEqual([]);
  });

  it('애플리케이션 칸은 aria-current 가 빠지고 붙는 것으로 짝짓는다', () => {
    const 줄 = document.createElement('nav');
    const [a, b] = ['A', 'B'].map(() => {
      const x = document.createElement('button');
      x.className = 'rail-app';
      줄.append(x);
      return x;
    });
    b!.setAttribute('aria-current', 'page');
    const 기록 = (target: Element, oldValue: string | null) => ({ target, oldValue, attributeName: 'aria-current' });
    expect(옮긴칸([기록(a!, 'page'), 기록(b!, null)])).toEqual([[a, b, 'rail']]);
  });

  it('밑줄 탭은 aria-selected 로 짝짓는다', () => {
    const 줄 = document.createElement('div');
    const [a, b] = [false, true].map((x) => {
      const t = document.createElement('button');
      t.className = 'scn-tab';
      t.setAttribute('aria-selected', String(x));
      줄.append(t);
      return t;
    });
    const 기록 = (target: Element, oldValue: string) => ({ target, oldValue, attributeName: 'aria-selected' });
    expect(옮긴칸([기록(a!, 'true'), 기록(b!, 'false')])).toEqual([[a, b, 'tab']]);
  });
});

describe('더깊다', () => {
  it('목록에서 그 아래 상세로 들어갈 때만 참이다', () => {
    expect(더깊다('#/cases', '#/cases/ABC-001')).toBe(true);
    expect(더깊다('#/cases?q=x', '#/cases/ABC-001?tab=a')).toBe(true);
    expect(더깊다('#/cases/ABC-001', '#/cases')).toBe(false);
    expect(더깊다('#/run', '#/runs/3')).toBe(false);
  });
});

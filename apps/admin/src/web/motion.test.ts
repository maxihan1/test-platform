// @vitest-environment jsdom
// 칩 미끄러짐이 어느 두 칩 사이에서 도는지 고르는 순수 부분을 본다
import { describe, expect, it } from 'vitest';

import { 옮긴칩 } from './motion.js';

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

describe('옮긴칩', () => {
  it('같은 묶음에서 하나가 꺼지고 하나가 켜지면 그 둘을 앞 → 새 차례로 준다', () => {
    const [a, b] = 묶음(false, true);
    expect(옮긴칩([{ target: a!, oldValue: 'true' }, { target: b!, oldValue: 'false' }])).toEqual([[a, b]]);
  });

  it('여러 개를 고르는 칩처럼 켜지기만 하면 움직이지 않는다', () => {
    const [, b] = 묶음(true, true);
    expect(옮긴칩([{ target: b!, oldValue: 'false' }])).toEqual([]);
  });

  it('다른 묶음의 칩끼리는 짝짓지 않는다', () => {
    const [a] = 묶음(false);
    const [b] = 묶음(true);
    expect(옮긴칩([{ target: a!, oldValue: 'true' }, { target: b!, oldValue: 'false' }])).toEqual([]);
  });

  it('칩이 아닌 단추는 보지 않는다', () => {
    const [a, b] = 묶음(false, true);
    a!.className = 'btn';
    b!.className = 'btn';
    expect(옮긴칩([{ target: a!, oldValue: 'true' }, { target: b!, oldValue: 'false' }])).toEqual([]);
  });
});

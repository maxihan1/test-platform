// 항목에 남기는 게임 요소 대조 줄 고르기 — 꼴이 틀린 줄 버리기 · 다른 줄 먼저 · 상한 (WEB-F7-24)

import { describe, expect, it } from 'vitest';

import { 대조상한, 대조칸 } from './runLifecycle.js';

describe('항목에 남기는 게임 요소 대조', () => {
  it('배열이 아니거나 남는 줄이 없으면 NULL 이다', () => {
    expect(대조칸(undefined)).toBeNull();
    expect(대조칸({ key: 'item:potion' })).toBeNull();
    expect(대조칸([])).toBeNull();
    expect(대조칸([null, 'item:potion', { key: 'item:potion' }])).toBeNull();
  });

  it('꼴이 틀린 줄은 버리고 다른 줄을 같은 줄보다 앞에 둔다', () => {
    const 같음 = { key: 'zone:Town', serverValue: 1, same: true };
    const 다름 = { key: 'item:potion', serverValue: 10000, same: false };
    expect(JSON.parse(대조칸([같음, null, 다름])!)).toEqual([다름, 같음]);
  });

  it('상한에서 자르고 다른 줄은 살린다', () => {
    const 같은줄들 = Array.from({ length: 대조상한 }, (_, i) => ({ key: `item:${String(i)}`, serverValue: i, same: true }));
    const 다름 = { key: 'item:potion', serverValue: 10000, same: false };
    const 남은것 = JSON.parse(대조칸([...같은줄들, 다름])!) as unknown[];
    expect(남은것).toHaveLength(대조상한);
    expect(남은것[0]).toEqual(다름);
  });
});

// 판 함수의 눈 검사 — 바닥 재화 못 봄: 적을 잡았는데 재화는 안 늘고 떨어진() 이 15초 이어 0 이면 한 번 잡는다
import { describe, expect, it } from 'vitest';

import type { 판상태 } from './follow.js';
import { 떨어진눈 } from './followEyes.js';
import { 중 } from './followFake.js';

const 돌림 = (줍는: boolean, 들: Array<[판상태, number, number]>) => {
  const 눈 = 떨어진눈(줍는);
  return 들.map(([s, n, t]) => 눈(s, n, t)).at(-1);
};

describe('바닥 재화 못 봄', () => {
  it('줍는 게임에서 적을 잡았는데 재화는 안 늘고 15초 이어 0 이면 한 번만 잡는다 — 16105 다섯째 맵', () => {
    const 눈 = 떨어진눈(true);
    expect(눈(중(1, { 남은적: 5 }), 0, 10)).toBeNull();
    expect(눈(중(1, { 남은적: 4 }), 0, 14)).toBeNull();
    expect(눈(중(1, { 남은적: 4 }), 0, 18)).toBeNull();
    expect(눈(중(1, { 남은적: 3 }), 0, 22)).toBeNull();
    expect(눈(중(1, { 남은적: 3 }), 0, 25)).toEqual({ 초: 10, 남은적: 3, 이어진초: 15 });
    expect(눈(중(1, { 남은적: 2 }), 0, 29)).toBeNull();
  });

  it('줍는 게임이 아니거나 · 하나라도 읽히거나 · 재화가 늘었거나 · 적을 안 잡았거나 · 웨이브가 바뀌거나 · 읽기 사이가 5초 넘게 벌면 안 잡는다', () => {
    const 이어 = (끝: 판상태): Array<[판상태, number, number]> => [[중(1, { 남은적: 5 }), 0, 0], [중(1, { 남은적: 5 }), 0, 4], [중(1, { 남은적: 4 }), 0, 8], [중(1, { 남은적: 4 }), 0, 12], [끝, 0, 15]];
    expect(돌림(true, 이어(중(1, { 남은적: 3 })))).not.toBeNull();
    expect(돌림(false, 이어(중(1, { 남은적: 3 })))).toBeNull();
    expect(돌림(true, [[중(1, { 남은적: 5 }), 0, 0], [중(1, { 남은적: 4 }), 1, 4], [중(1, { 남은적: 4 }), 0, 8], [중(1, { 남은적: 3 }), 0, 12], [중(1, { 남은적: 3 }), 0, 15]])).toBeNull();
    expect(돌림(true, 이어(중(1, { 남은적: 3, 재화: 4 })))).toBeNull();
    expect(돌림(true, 이어(중(1, { 남은적: 5 })))).toBeNull();
    expect(돌림(true, 이어(중(2, { 남은적: 3 })))).toBeNull();
    expect(돌림(true, [[중(1, { 남은적: 5 }), 0, 0], [중(1, { 남은적: 3 }), 0, 15]])).toBeNull();
  });
});

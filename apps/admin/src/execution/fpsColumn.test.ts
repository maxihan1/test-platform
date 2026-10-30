// 항목에 남기는 게임 FPS 줄 고르기 — 꼴이 틀린 줄 버리기 · 다 빈칸이면 NULL · 상한 (WEB-F7-25)

import { describe, expect, it } from 'vitest';

import { FPS상한, FPS칸 } from './runLifecycle.js';

describe('항목에 남기는 게임 FPS', () => {
  it('배열이 아니거나 읽은 초가 하나도 없으면 NULL 이다', () => {
    expect(FPS칸(undefined)).toBeNull();
    expect(FPS칸({ seq: 1, fps: 60 })).toBeNull();
    expect(FPS칸([])).toBeNull();
    expect(FPS칸([{ seq: 1, fps: null }, { seq: 2, fps: null }])).toBeNull();
  });

  it('꼴이 틀린 줄은 버리고 못 읽은 초는 빈칸으로 남기며 다른 칸은 싣지 않는다', () => {
    const 받은것 = [{ seq: 1, fps: null }, { seq: 1, fps: 59.5, 덤: 'x' }, { seq: 1.5, fps: 60 }, { seq: 2, fps: 'NaN' }, null, { seq: 2, fps: 38 }];
    expect(JSON.parse(FPS칸(받은것)!)).toEqual([
      { seq: 1, fps: null },
      { seq: 1, fps: 59.5 },
      { seq: 2, fps: 38 },
    ]);
  });

  it('상한에서 앞을 남기고 자른다', () => {
    const 줄들 = Array.from({ length: FPS상한 + 5 }, (_, i) => ({ seq: 1, fps: i }));
    const 남은것 = JSON.parse(FPS칸(줄들)!) as { fps: number }[];
    expect(남은것).toHaveLength(FPS상한);
    expect(남은것.at(-1)!.fps).toBe(FPS상한 - 1);
  });
});

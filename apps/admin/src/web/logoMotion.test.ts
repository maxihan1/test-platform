// 로고 움직임 다시 돌리기 검사
import { describe, expect, it, vi } from 'vitest';

import { 로고움직임다시 } from './logoMotion.js';

function 움직임(animationName: string) {
  return { animationName, cancel: vi.fn(), play: vi.fn() };
}

describe('로고움직임다시', () => {
  it('로고 움직임 셋만 처음으로 되감아 다시 돌리고 다른 움직임은 건드리지 않는다', () => {
    const 체크 = 움직임('logo-check');
    const 글자 = 움직임('logo-slide');
    const 밑줄 = 움직임('logo-line');
    const 다른것 = 움직임('rise');
    로고움직임다시({ getAnimations: () => [체크, 글자, 밑줄, 다른것] as unknown as Animation[] });
    for (const a of [체크, 글자, 밑줄]) {
      expect(a.cancel).toHaveBeenCalledOnce();
      expect(a.play).toHaveBeenCalledOnce();
    }
    expect(다른것.cancel).not.toHaveBeenCalled();
    expect(다른것.play).not.toHaveBeenCalled();
  });

  it('브라우저가 움직임 목록을 못 주면 아무것도 하지 않는다', () => {
    expect(() => 로고움직임다시({} as Pick<Document, 'getAnimations'>)).not.toThrow();
  });
});

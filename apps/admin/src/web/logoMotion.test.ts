// 로고 움직임 다시 돌리기 검사
import { describe, expect, it, vi } from 'vitest';

import { 로고움직임다시 } from './logoMotion.js';

function 움직임(animationName: string, playState: AnimationPlayState = 'finished') {
  return { animationName, playState, cancel: vi.fn(), play: vi.fn() };
}

function 문서(...칸들: ReturnType<typeof 움직임>[][]) {
  const 요소들 = 칸들.map((움직임들) => ({ getAnimations: () => 움직임들 }));
  return { querySelectorAll: () => 요소들 } as unknown as Pick<Document, 'querySelectorAll'>;
}

describe('로고움직임다시', () => {
  it('로고 두 곳의 로고 움직임 셋만 처음으로 되감아 다시 돌리고 다른 움직임은 건드리지 않는다', () => {
    const 체크 = 움직임('logo-check');
    const 글자 = 움직임('logo-slide');
    const 밑줄 = 움직임('logo-line');
    const 다른것 = 움직임('rise');
    로고움직임다시(문서([글자, 밑줄, 다른것], [체크]));
    for (const a of [체크, 글자, 밑줄]) {
      expect(a.cancel).toHaveBeenCalledOnce();
      expect(a.play).toHaveBeenCalledOnce();
    }
    expect(다른것.cancel).not.toHaveBeenCalled();
  });

  it('아직 도는 중이면 다시 시작하지 않는다 — 로고 위를 오갈 때 글자가 깜빡이지 않게', () => {
    const 체크 = 움직임('logo-check', 'running');
    const 글자 = 움직임('logo-slide');
    로고움직임다시(문서([글자], [체크]));
    expect(글자.cancel).not.toHaveBeenCalled();
    expect(체크.cancel).not.toHaveBeenCalled();
  });

  it('밑줄만 흐려지는 중이면 막지 않고 다시 돌린다 — 글자가 자리 잡은 뒤의 마우스 올림이 먹힌다', () => {
    const 밑줄 = 움직임('logo-line', 'running');
    const 글자 = 움직임('logo-slide');
    로고움직임다시(문서([글자, 밑줄]));
    expect(글자.play).toHaveBeenCalledOnce();
    expect(밑줄.play).toHaveBeenCalledOnce();
  });

  it('브라우저가 움직임 목록을 못 주면 아무것도 하지 않는다', () => {
    const 빈것 = { querySelectorAll: () => [{}] } as unknown as Pick<Document, 'querySelectorAll'>;
    expect(() => 로고움직임다시(빈것)).not.toThrow();
  });
});

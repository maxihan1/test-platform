// @vitest-environment jsdom
// maxihan 계정 왕복 뒤 주소의 ?sso=ok 표시 떼기 검사 (도메인/인증 §8.6)

import { afterEach, describe, expect, it } from 'vitest';

import { sso알림을단다, 막로그인표시를뗀다 } from './useSSO.js';

afterEach(() => window.history.replaceState(null, '', '/'));

describe('막로그인표시를뗀다', () => {
  it('?sso=ok 를 떼고 참을 내며, 떠나기 막기가 적어 둔 칸 번호는 남긴다', () => {
    window.history.replaceState({ navIndex: 0 }, '', '/?sso=ok#/runs/fn');

    expect(막로그인표시를뗀다()).toBe(true);
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#/runs/fn');
    expect(window.history.state).toEqual({ navIndex: 0 });
  });

  it('표시가 없으면 거짓이고 주소를 건드리지 않는다', () => {
    window.history.replaceState({ navIndex: 2 }, '', '/?x=1#/a');

    expect(막로그인표시를뗀다()).toBe(false);
    expect(window.location.search).toBe('?x=1');
    expect(window.history.state).toEqual({ navIndex: 2 });
  });
});

describe('sso알림을단다', () => {
  it('?sso=<값> 을 달아 로그인 화면이 다시 보내지 않고 카드를 그리게 하고, 칸 번호와 해시는 남긴다', () => {
    window.history.replaceState({ navIndex: 1 }, '', '/#/runs/fn');

    sso알림을단다('failed');

    expect(window.location.search).toBe('?sso=failed');
    expect(window.location.hash).toBe('#/runs/fn');
    expect(window.history.state).toEqual({ navIndex: 1 });
  });

  it('앞에 붙은 다른 알림은 덮는다', () => {
    window.history.replaceState(null, '', '/?sso=ok#/login');

    sso알림을단다('out');

    expect(window.location.search).toBe('?sso=out');
  });
});

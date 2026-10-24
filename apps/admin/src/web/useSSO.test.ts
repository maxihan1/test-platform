// @vitest-environment jsdom
// maxihan 계정 왕복 뒤 주소의 ?sso=ok 표시 떼기 검사 (도메인/인증 §8.6)

import { afterEach, describe, expect, it } from 'vitest';

import { 막로그인표시를뗀다 } from './useSSO.js';

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

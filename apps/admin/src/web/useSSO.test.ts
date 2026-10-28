// @vitest-environment jsdom
// maxihan 계정 왕복 뒤 주소의 ?sso=ok 표시 떼기 검사 (도메인/인증 §8.6)

import { afterEach, describe, expect, it } from 'vitest';

import {
  sso알림을단다,
  계정을기억한다,
  기억한계정을읽는다,
  기억한계정을지운다,
  로그아웃표시를단다,
  로그아웃표시를뗀다,
  로그아웃했나,
  막로그인표시를뗀다,
} from './useSSO.js';

afterEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

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

describe('로그아웃 표시', () => {
  it('달면 새로 읽어도 남고 떼면 사라진다', () => {
    expect(로그아웃했나()).toBe(false);
    로그아웃표시를단다();
    expect(로그아웃했나()).toBe(true);
    로그아웃표시를뗀다();
    expect(로그아웃했나()).toBe(false);
  });
});

describe('기억한 계정', () => {
  it('아이디와 이름을 기억하고 지우면 없다', () => {
    계정을기억한다({ username: 'maxi', name: '한맥시' });
    expect(기억한계정을읽는다()).toEqual({ username: 'maxi', name: '한맥시' });
    기억한계정을지운다();
    expect(기억한계정을읽는다()).toBeNull();
  });

  it('깨진 값 · 모양이 다른 값은 기억한 계정이 없는 것과 같다', () => {
    localStorage.setItem('마지막계정', '{깨짐');
    expect(기억한계정을읽는다()).toBeNull();
    localStorage.setItem('마지막계정', JSON.stringify({ username: '', name: 'x' }));
    expect(기억한계정을읽는다()).toBeNull();
    localStorage.setItem('마지막계정', JSON.stringify(['maxi']));
    expect(기억한계정을읽는다()).toBeNull();
  });
});

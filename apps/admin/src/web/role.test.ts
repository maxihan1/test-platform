import { describe, expect, it } from 'vitest';

import { 할수있나 } from './role.js';

describe('등급', () => {
  it('보기만 등급에게 실행·멈춤·증적 만들기·입력값 저장·설정은 없다', () => {
    expect(할수있나('viewer', '실행')).toBe(false);
    expect(할수있나('viewer', '멈춤')).toBe(false);
    expect(할수있나('viewer', '증적만들기')).toBe(false);
    expect(할수있나('viewer', '입력값저장')).toBe(false);
    expect(할수있나('viewer', '설정')).toBe(false);
  });

  it('보기만 등급도 이미 만들어진 증적은 받는다. 받는 것은 읽기다', () => {
    expect(할수있나('viewer', '증적받기')).toBe(true);
  });

  it('실행까지 등급은 설정만 못 한다', () => {
    expect(할수있나('operator', '실행')).toBe(true);
    expect(할수있나('operator', '멈춤')).toBe(true);
    expect(할수있나('operator', '증적만들기')).toBe(true);
    expect(할수있나('operator', '입력값저장')).toBe(true);
    expect(할수있나('operator', '설정')).toBe(false);
  });

  it('운영 등급은 전부 할 수 있다', () => {
    expect(할수있나('admin', '실행')).toBe(true);
    expect(할수있나('admin', '설정')).toBe(true);
    expect(할수있나('admin', '증적받기')).toBe(true);
  });

  it('로그인하지 않은 사람은 아무것도 못 한다', () => {
    expect(할수있나(null, '실행')).toBe(false);
    expect(할수있나(null, '증적받기')).toBe(false);
  });

  it('실행 등급은 작성을 요청할 수 있다. 결과가 초안 PR 이라 마음에 안 들면 버리면 된다', () => {
    expect(할수있나('operator', '작성요청')).toBe(true);
  });

  it('실행 등급은 머지를 못 한다. 머지는 저장소를 영구히 바꾼다', () => {
    expect(할수있나('operator', '작성머지')).toBe(false);
  });

  it('운영 등급은 머지까지 할 수 있다', () => {
    expect(할수있나('admin', '작성머지')).toBe(true);
  });

  it('보기만 등급은 작성을 요청하지 못한다', () => {
    expect(할수있나('viewer', '작성요청')).toBe(false);
  });
});

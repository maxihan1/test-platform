// 출입증 쿠키 설정 — 바깥 주소가 https 인 설치만 secure 를 단다

import { describe, expect, it } from 'vitest';

import { 쿠키설정 } from './session.js';

describe('쿠키설정', () => {
  it('바깥 주소가 https 면 secure 를 단다', () => {
    expect(쿠키설정('https://qa.example.com')).toEqual({ path: '/', httpOnly: true, sameSite: 'lax', secure: true });
  });

  it('http 로 여는 설치 · 바깥 주소가 없는 설치는 secure 를 달지 않는다', () => {
    expect(쿠키설정('http://localhost:3000').secure).toBe(false);
    expect(쿠키설정('').secure).toBe(false);
  });
});

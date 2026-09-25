// 역방향 작성 요청 검사 — 시작 주소 · 만들기 · 줄 세우기 · 목록/상세 칸 · 집기 target · diffs (SPEC 도메인/작성 §3.6 「★ 역방향」 · §7)

import { describe, expect, it } from 'vitest';

import { 시작주소 } from './reverse.js';

describe('시작주소 — 대상 서버와 출처가 같은 http·https 주소만 다시 조립해 받는다', () => {
  const 서버 = 'https://qa.example.com';

  it('같은 출처면 다시 조립한 href 를 준다', () => {
    expect(시작주소('https://qa.example.com/orders?tab=1#top', 서버)).toBe('https://qa.example.com/orders?tab=1#top');
    expect(시작주소('https://QA.example.com:443/a', 서버)).toBe('https://qa.example.com/a');
  });

  it('서버 주소에 경로가 있어도 출처만 본다', () => {
    expect(시작주소('https://qa.example.com/login', 'https://qa.example.com/app/')).toBe('https://qa.example.com/login');
  });

  it('출처가 다르면 받지 않는다 — 호스트·포트·scheme', () => {
    expect(시작주소('https://evil.example.com/', 서버)).toBeNull();
    expect(시작주소('https://qa.example.com:8443/', 서버)).toBeNull();
    expect(시작주소('http://qa.example.com/', 서버)).toBeNull();
  });

  it('http·https 밖은 받지 않는다', () => {
    expect(시작주소('javascript:alert(1)', 서버)).toBeNull();
    expect(시작주소('file:///etc/passwd', 'file:///etc/')).toBeNull();
  });

  it('아이디·비밀번호가 박힌 주소(user:pass@)는 받지 않는다', () => {
    expect(시작주소('https://a:b@qa.example.com/', 서버)).toBeNull();
    expect(시작주소('https://a@qa.example.com/', 서버)).toBeNull();
  });

  it('주소가 아니거나 글자가 아니면 받지 않는다', () => {
    expect(시작주소('orders', 서버)).toBeNull();
    expect(시작주소(42, 서버)).toBeNull();
    expect(시작주소(undefined, 서버)).toBeNull();
  });

  it('서버 주소가 깨져 있어도 던지지 않고 받지 않는다', () => {
    expect(시작주소('https://qa.example.com/', '깨진 주소')).toBeNull();
    expect(시작주소('https://qa.example.com/', null)).toBeNull();
  });
});

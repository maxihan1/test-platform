// 서비스 설정 「훑지 않을 경로」 값 규칙 검사 — 서버 · 화면 · 작성 에이전트가 같은 규칙을 쓴다 (SPEC 도메인/인증 §7 · 2026-10-04)
import { describe, expect, it } from 'vitest';

import { 제외되나, 제외경로정리 } from './rules.js';

describe('제외경로정리 — 적은 줄을 저장할 목록으로', () => {
  it('앞뒤 공백 · 빈 줄 · 끝의 / 를 걷고 같은 것은 하나로', () => {
    expect(제외경로정리([' /daejeon/ ', '', '/gyeongnam', '/daejeon'])).toEqual({ 값: ['/daejeon', '/gyeongnam'] });
  });

  it('한글 · 숫자 · . _ ~ % - 와 여러 마디는 받는다', () => {
    expect(제외경로정리(['/지역/대전', '/a.b_c~d%20e-f', '/v2/old'])).toEqual({ 값: ['/지역/대전', '/a.b_c~d%20e-f', '/v2/old'] });
  });

  it('/ 로 시작하지 않거나 셸 글자 · 공백 · 따옴표가 있으면 그 줄을 돌려준다 — 값이 자식의 명령줄에 들어간다 (검토 BLOCKER 1)', () => {
    for (const 줄 of ['daejeon', '/a;b', '/$(id)', '/`x`', "/a'b", '/a b', '/a"b', '/', '//a', '/a//b', '/a?b=1', '/a#b']) {
      expect(제외경로정리([줄]), 줄).toEqual({ 틀린줄: 줄.trim(), 까닭: '모양' });
    }
  });

  it('100자를 넘거나 20개를 넘으면 거절', () => {
    expect(제외경로정리([`/${'a'.repeat(100)}`])).toEqual({ 틀린줄: `/${'a'.repeat(100)}`, 까닭: '길이' });
    expect(제외경로정리(Array.from({ length: 21 }, (_, i) => `/p${i}`))).toEqual({ 틀린줄: '/p20', 까닭: '개수' });
  });
});

describe('제외되나 — 마디 경계로 본다', () => {
  const 목록 = ['/daejeon', '/지역'];

  it('그 경로와 그 아래는 뺀다', () => {
    expect(제외되나('/daejeon', 목록)).toBe(true);
    expect(제외되나('/daejeon/about/world', 목록)).toBe(true);
  });

  it('이름이 이어 붙은 경로는 안 뺀다', () => {
    expect(제외되나('/daejeonx', 목록)).toBe(false);
    expect(제외되나('/about', 목록)).toBe(false);
  });

  it('인코딩된 한글 경로도 같게 본다 · 대소문자는 가른다(주소 경로는 대소문자를 가른다)', () => {
    expect(제외되나('/%EC%A7%80%EC%97%AD/a', 목록)).toBe(true);
    expect(제외되나('/Daejeon', 목록)).toBe(false);
  });

  it('목록이 비면 아무것도 안 뺀다', () => {
    expect(제외되나('/daejeon', [])).toBe(false);
  });
});

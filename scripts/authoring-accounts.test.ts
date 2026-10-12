// 역할별 계정의 에이전트 쪽 판정 검사 — 가릴 비밀번호 목록 · 길이 점검 · 자식 환경 PLATFORM_ACCOUNTS (도메인/작성 §3.6 「★ 역할별 계정」)
import { describe, expect, it } from 'vitest';

import { type 계정줄, 계정점검, 계정환경, 비밀번호들, 환경비밀번호들 } from './authoring-accounts.js';

const 회원: 계정줄 = { env: 'qa', baseUrl: 'https://qa.test', role: '일반 회원', loginId: 'user01', loginPassword: 'member-pw' };
const 관리자: 계정줄 = { env: 'qa', baseUrl: 'https://qa.test', role: '관리자', loginId: 'admin01', loginPassword: 'admin-pw-long' };

describe('비밀번호들 — 가릴 비밀번호 전부', () => {
  it('target 과 accounts 의 비밀번호를 모두 모으고 빈 값 · 같은 값은 뺀다', () => {
    expect(비밀번호들({ target: { loginPassword: 'member-pw' }, accounts: [회원, 관리자, { ...관리자, loginPassword: '' }] })).toEqual([
      'admin-pw-long',
      'member-pw',
    ]);
  });

  it('target 없는 반영 행도 accounts 로 목록을 만든다 · 둘 다 없으면 빈 목록', () => {
    expect(비밀번호들({ accounts: [관리자] })).toEqual(['admin-pw-long']);
    expect(비밀번호들({})).toEqual([]);
    expect(비밀번호들({ target: { loginPassword: null } })).toEqual([]);
  });

  it('긴 것부터 준다 — 짧은 것이 긴 것의 일부여도 긴 것을 먼저 가린다', () => {
    expect(비밀번호들({ target: { loginPassword: 'pass1234' }, accounts: [{ loginPassword: 'pass12345' }] })).toEqual(['pass12345', 'pass1234']);
  });
});

describe('환경비밀번호들 — 자식 쪽은 받은 환경 변수로 같은 목록을 만든다', () => {
  it('TARGET_LOGIN_PASSWORD 와 PLATFORM_ACCOUNTS 의 비밀번호 전부', () => {
    const env = { TARGET_LOGIN_PASSWORD: 'member-pw', PLATFORM_ACCOUNTS: 계정환경([회원, 관리자]).PLATFORM_ACCOUNTS };
    expect(환경비밀번호들(env)).toEqual(['admin-pw-long', 'member-pw']);
  });

  it('없으면 빈 목록 · JSON 이 아니면 값 없이 던진다', () => {
    expect(환경비밀번호들({})).toEqual([]);
    expect(() => 환경비밀번호들({ PLATFORM_ACCOUNTS: '[{"loginPassword":"secret-pw' })).toThrow('PLATFORM_ACCOUNTS 가 JSON 이 아니다');
    expect(() => 환경비밀번호들({ PLATFORM_ACCOUNTS: '[{"loginPassword":"secret-pw' })).not.toThrow(/secret-pw/);
    expect(() => 환경비밀번호들({ PLATFORM_ACCOUNTS: '{}' })).toThrow('배열이 아니다');
  });
});

describe('계정점검 — 역할 계정 비밀번호도 짧으면 FAILED', () => {
  it('비밀최소보다 짧은 줄이 있으면 서버 줄 · 역할 이름을 넣은 사유 — 값은 싣지 않는다', () => {
    const 사유 = 계정점검([회원, { ...관리자, loginPassword: 'abc' }]);
    expect(사유).toBe('대상 서버 「qa」 의 「관리자」 테스트 계정 비밀번호가 4자보다 짧아 올리는 글에 새는지 검사할 수 없다 — 더 긴 비밀번호로 바꿔라');
    expect(사유).not.toContain('abc');
  });

  it('모두 길거나 계정이 없으면 null', () => {
    expect(계정점검([회원, 관리자])).toBeNull();
    expect(계정점검(undefined)).toBeNull();
    expect(계정점검([])).toBeNull();
  });
});

describe('계정환경 — 자식 · 3회 실행에 넘길 PLATFORM_ACCOUNTS', () => {
  it('baseUrl · role · loginId · loginPassword 만 JSON 으로 싣는다(env 는 뺀다)', () => {
    expect(JSON.parse(계정환경([회원, 관리자]).PLATFORM_ACCOUNTS ?? '')).toEqual([
      { baseUrl: 'https://qa.test', role: '일반 회원', loginId: 'user01', loginPassword: 'member-pw' },
      { baseUrl: 'https://qa.test', role: '관리자', loginId: 'admin01', loginPassword: 'admin-pw-long' },
    ]);
  });

  it('계정이 없으면 키 자체가 없다 — 정방향 작성 행', () => {
    expect(계정환경(undefined)).toEqual({});
    expect(계정환경([])).toEqual({});
  });
});

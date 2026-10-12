// 비밀값 칸의 역할 · 아이디/비밀번호 판정과 대상 서버 계정 채우기 (도메인/작성 §3.6 「★ 역할별 계정」)

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { 계정채우기, 계정칸, 기본역할, 출처 } from './accounts.js';

const 계정들 = [
  { role: 기본역할, loginId: 'user01', loginPassword: 'member-pw' },
  { role: '관리자', loginId: 'admin01', loginPassword: 'admin-pw' },
];

describe('계정칸', () => {
  it('account 꼬리표가 없는 비밀값 칸은 일반 회원이다', () => {
    expect(계정칸('loginId', { secret: true })).toEqual({ role: '일반 회원', 칸: 'loginId' });
    expect(계정칸('password', { secret: true })).toEqual({ role: '일반 회원', 칸: 'loginPassword' });
  });

  it('account 꼬리표가 역할을 고른다', () => {
    expect(계정칸('adminId', { secret: true, account: ' 관리자 ' })).toEqual({ role: '관리자', 칸: 'loginId' });
    expect(계정칸('adminPassword', { secret: true, account: '관리자' })).toEqual({ role: '관리자', 칸: 'loginPassword' });
  });

  it('비밀값이 아니거나 이름이 계정 칸이 아니면 null 이다', () => {
    expect(계정칸('loginId', {})).toBeNull();
    expect(계정칸('loginId', undefined)).toBeNull();
    expect(계정칸('apiToken', { secret: true })).toBeNull();
  });

  it('꼬리표 없는 칸은 로그인 칸 이름 그대로일 때만 채운다 — 새 비밀번호 · 계좌 번호는 아니다', () => {
    expect(계정칸('newPassword', { secret: true })).toBeNull();
    expect(계정칸('confirmPassword', { secret: true })).toBeNull();
    expect(계정칸('accountNumber', { secret: true })).toBeNull();
    expect(계정칸('email', { secret: true })).toEqual({ role: '일반 회원', 칸: 'loginId' });
  });
});

describe('출처', () => {
  it('경로 · 쿼리를 떼고 scheme · host · port 만 본다', () => {
    expect(출처('https://qa.demo:8443/login?x=1')).toBe('https://qa.demo:8443');
    expect(출처('주소 아님')).toBeNull();
    expect(출처(undefined)).toBeNull();
  });
});

describe('계정채우기', () => {
  const 칸들 = {
    loginId: { secret: true },
    password: { secret: true },
    adminId: { secret: true, account: '관리자' },
    adminPassword: { secret: true, account: '관리자' },
    title: {},
  };

  it('없는 계정 칸만 역할 계정으로 채운다', () => {
    expect(계정채우기(칸들, { title: '글', loginId: '직접 넣은 값' }, 계정들)).toEqual({
      title: '글',
      loginId: '직접 넣은 값',
      password: 'member-pw',
      adminId: 'admin01',
      adminPassword: 'admin-pw',
    });
  });

  it('빈 글자는 사람이 지운 칸이라 그대로 둔다', () => {
    expect(계정채우기(칸들, { password: '' }, 계정들).password).toBe('');
  });

  it('그 역할 계정이 없으면 비워 둔다', () => {
    const 채움 = 계정채우기(칸들, {}, [계정들[0]!]);
    expect(채움.adminId).toBeUndefined();
    expect(채움.loginId).toBe('user01');
  });

  it('zod meta 를 JSON Schema 로 바꿔도 같은 꼬리표가 남는다', () => {
    const 스키마 = z.toJSONSchema(
      z.object({ adminId: z.string().optional().meta({ secret: true, account: '관리자' }) }),
    ) as { properties: Record<string, { secret?: unknown; account?: unknown }> };
    expect(계정채우기(스키마.properties, {}, 계정들)).toEqual({ adminId: 'admin01' });
  });
});

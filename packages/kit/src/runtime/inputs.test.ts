// 러너가 환경변수로 실어 보낸 입력값·기대값이 케이스에 어떻게 도착하는지 검사한다 (SPEC §5.2)

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineCase } from './defineCase.js';
import { injectedInputs, resolveInputs } from './inputs.js';

const withParams = defineCase({
  tcId: 'DEMO-101',
  name: '입력값이 있는 케이스',
  precondition: [],
  params: z.object({
    title: z.string().describe('글 제목').default('기본 제목'),
    userId: z.number().describe('작성자 번호'),
  }),
  expected: z.object({ statusCode: z.number().describe('응답 코드').default(201) }),
});

const withAccounts = defineCase({
  tcId: 'DEMO-103',
  name: '계정 칸이 있는 케이스',
  precondition: [],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    keyword: z.string().describe('검색어').default('신발'),
  }),
  expected: null,
});

const accountsEnv = (rows: unknown[], baseUrl = 'https://qa.test/start') => ({
  PLATFORM_BASE_URL: baseUrl,
  PLATFORM_ACCOUNTS: JSON.stringify(rows),
});

const qaRows = [
  { baseUrl: 'https://qa.test', role: '일반 회원', loginId: 'user01', loginPassword: 'member-pw' },
  { baseUrl: 'https://qa.test', role: '관리자', loginId: 'admin01', loginPassword: 'admin-pw' },
  { baseUrl: 'https://stage.test', role: '관리자', loginId: 'stage-admin', loginPassword: 'stage-pw' },
];

const withoutParams = defineCase({
  tcId: 'DEMO-102',
  name: '입력값이 없는 케이스',
  precondition: [],
  params: null,
  expected: null,
});

describe('injectedInputs', () => {
  it('환경변수가 없으면 빈 값으로 둔다', () => {
    expect(injectedInputs({})).toEqual({ params: {}, expected: {} });
  });

  it('params와 expected를 한 객체로 실어 보낸 것을 갈라 읽는다', () => {
    const raw = JSON.stringify({ params: { userId: 7 }, expected: { statusCode: 200 } });

    expect(injectedInputs({ PLATFORM_PARAMS: raw })).toEqual({
      params: { userId: 7 },
      expected: { statusCode: 200 },
    });
  });

  it('JSON이 아니면 무엇이 잘못됐는지 알리며 멈춘다', () => {
    expect(() => injectedInputs({ PLATFORM_PARAMS: '{망가진' })).toThrow(/PLATFORM_PARAMS/);
  });
});

describe('resolveInputs', () => {
  it('주입된 값이 없으면 스키마의 기본값이 들어간다', () => {
    const resolved = resolveInputs(withParams, { params: { userId: 7 }, expected: {} });

    expect(resolved.params).toEqual({ title: '기본 제목', userId: 7 });
    expect(resolved.expected).toEqual({ statusCode: 201 });
  });

  it('주입된 값이 기본값을 덮는다', () => {
    const resolved = resolveInputs(withParams, {
      params: { title: '바뀐 제목', userId: 9 },
      expected: { statusCode: 200 },
    });

    expect(resolved.params).toEqual({ title: '바뀐 제목', userId: 9 });
    expect(resolved.expected).toEqual({ statusCode: 200 });
  });

  it('명세에 어긋나는 값이면 케이스와 항목을 짚어 멈춘다', () => {
    expect(() => resolveInputs(withParams, { params: {}, expected: {} })).toThrow(/DEMO-101.*입력값.*userId/s);
  });

  it('없다고 적은 케이스에는 빈 객체를 넘긴다', () => {
    expect(resolveInputs(withoutParams, { params: { 버려질: 1 }, expected: {} })).toEqual({
      params: {},
      expected: {},
    });
  });
});

describe('계정 채우기 — PLATFORM_ACCOUNTS (작성 §3.6 「★ 역할별 계정」)', () => {
  it('실행 주소와 출처가 같은 줄의 계정으로 아이디 · 비밀번호 칸을 채운다 — 꼬리표 없는 칸은 일반 회원', () => {
    const resolved = resolveInputs(withAccounts, injectedInputs(accountsEnv(qaRows)));

    expect(resolved.params).toMatchObject({ loginId: 'user01', password: 'member-pw', keyword: '신발' });
  });

  it("account '관리자' 칸은 그 역할 계정으로 채운다", () => {
    const resolved = resolveInputs(withAccounts, injectedInputs(accountsEnv(qaRows)));

    expect(resolved.params).toMatchObject({ adminId: 'admin01', adminPassword: 'admin-pw' });
  });

  it('출처가 다른 줄의 계정은 쓰지 않는다', () => {
    const rows = [{ baseUrl: 'https://stage.test', role: '관리자', loginId: 'stage-admin', loginPassword: 'stage-pw' }];
    const resolved = resolveInputs(withAccounts, injectedInputs(accountsEnv(rows)));

    expect(resolved.params).toEqual({ keyword: '신발' });
    expect(injectedInputs(accountsEnv(qaRows, 'https://qa.test:8443'))).not.toHaveProperty('accounts');
  });

  it('PLATFORM_PARAMS 로 온 값이 이긴다', () => {
    const env = { ...accountsEnv(qaRows), PLATFORM_PARAMS: JSON.stringify({ params: { password: 'typed-pw' } }) };
    const resolved = resolveInputs(withAccounts, injectedInputs(env));

    expect(resolved.params).toMatchObject({ loginId: 'user01', password: 'typed-pw', adminPassword: 'admin-pw' });
  });

  it('PLATFORM_ACCOUNTS 가 없거나 PLATFORM_BASE_URL 이 없으면 아무것도 안 채운다', () => {
    expect(resolveInputs(withAccounts, injectedInputs({})).params).toEqual({ keyword: '신발' });
    expect(injectedInputs({ PLATFORM_ACCOUNTS: JSON.stringify(qaRows) })).toEqual({ params: {}, expected: {} });
  });

  it('JSON 이 아니면 이름을 짚어 멈추고 값은 싣지 않는다', () => {
    const broken = { PLATFORM_BASE_URL: 'https://qa.test', PLATFORM_ACCOUNTS: '[{"loginPassword":"admin-pw' };

    expect(() => injectedInputs(broken)).toThrow(/PLATFORM_ACCOUNTS/);
    expect(() => injectedInputs(broken)).not.toThrow(/admin-pw/);
    expect(() => injectedInputs({ PLATFORM_BASE_URL: 'https://qa.test', PLATFORM_ACCOUNTS: '{}' })).toThrow(/배열/);
  });

  it('params 가 없다고 적은 케이스는 건드리지 않는다', () => {
    expect(resolveInputs(withoutParams, injectedInputs(accountsEnv(qaRows))).params).toEqual({});
  });
});

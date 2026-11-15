import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 문구가보이나 } from './helpers/compose-flow.helper.js';

import { 검색화면 } from './pages/search.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-354',
  name: '없는 계정으로 「로 이동」을 누르면 토스트 「검색어에 대한 결과를 찾을 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    계정: z.string().min(1).describe('검색에 적을 없는 계정 — 골뱅이로 시작하고 도메인이 없는 계정').default('@zzqq_none'),
  }),
  expected: z.object({
    이동줄: z.string().describe('이동 줄에 든 글').default('로 이동'),
    토스트: z.string().describe('토스트 글').default('검색어에 대한 결과를 찾을 수 없습니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 검색 입력 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('검색 입력 화면이 열린다', await 검색.열기(), true, { blocker: true });
  });

  await test.step('없는 계정 「@zzqq_none」으로 이동을 누른다', async () => {
    await 검색.적기(params.계정);
    const 줄 = 검색.행포함(expected.이동줄);
    await verify('이동 줄이 보인다', await 뜰때까지(driver, 줄, 15_000), true, { blocker: true });
    await driver.$(줄).click();
    await verify('없는 계정으로 「로 이동」을 누르면 토스트 「검색어에 대한 결과를 찾을 수 없습니다」가 보인다', await 문구가보이나(driver, expected.토스트, 15_000), true);
  });
});

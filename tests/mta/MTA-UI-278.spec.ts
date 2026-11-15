import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 화면글포함 } from './helpers/compose-flow.helper.js';

import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-278',
  name: '둘러보기 「해시태그」 탭에 유행 해시태그와 「명이 말하고 있음」 줄이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    말하는줄: z.string().describe('해시태그 줄에 든 글').default('명이 말하고 있음'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 둘러보기 = new 둘러보기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('둘러보기 「해시태그」 탭을 연다', async () => {
    await verify('둘러보기 화면이 열린다', await 둘러보기.열기(), true, { blocker: true });
    await 둘러보기.탭누르기('해시태그');
    const 태그 = await verify('유행 해시태그가 보인다', await 뜰때까지(driver, 둘러보기.해시태그글, 15_000), true);
    const 줄 = await verify('「명이 말하고 있음」 줄이 보인다', await 뜰때까지(driver, 화면글포함(expected.말하는줄), 10_000), true);
    await verify('둘러보기 「해시태그」 탭에 유행 해시태그와 「명이 말하고 있음」 줄이 보인다', 태그 && 줄, true);
  });
});

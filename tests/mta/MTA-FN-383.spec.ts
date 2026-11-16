import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 글이될때까지읽기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-383',
  name: '잠긴 계정 프로필에서 「Cancel request」를 누르면 버튼이 「Request to follow」로 바뀌고 다시 누르면 「Cancel request」로 바뀐다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    요청글: z.string().describe('요청 전 동작 버튼 글').default('Request to follow'),
    취소글: z.string().describe('요청 대기 중 동작 버튼 글').default('Cancel request'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  let 누른횟수 = 0;
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('팔로우 요청 대기 중인 yuna_locked 프로필에서 「Cancel request」를 누른다', async () => {
      await 프로필열기(driver, 'yuna_locked');
      await verify('팔로우 요청 대기 중인 프로필의 동작 버튼이 「Cancel request」다', await 프로필.동작글(), expected.취소글, { blocker: true });
      await 프로필.동작누르기();
      누른횟수 += 1;
      const 첫째 = await verify('잠긴 계정 프로필의 버튼이 「Request to follow」로 바뀐다', await 글이될때까지읽기(driver, 프로필.동작버튼, expected.요청글), expected.요청글);
      await 프로필.동작누르기();
      누른횟수 += 1;
      const 둘째 = await verify('잠긴 계정 프로필의 버튼이 「Cancel request」로 다시 바뀐다', await 글이될때까지읽기(driver, 프로필.동작버튼, expected.취소글), expected.취소글);
      await verify('잠긴 계정 프로필에서 「Cancel request」를 누르면 버튼이 「Request to follow」로 바뀌고 다시 누르면 「Cancel request」로 바뀐다', 첫째 && 둘째, true);
    });
  } finally {
    if (누른횟수 % 2 === 1) await 프로필.동작누르기();
  }
});

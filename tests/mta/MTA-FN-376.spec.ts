import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 스낵바글기다리기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-376',
  name: '알림 종 버튼을 누르면 스낵바 「새로운 게시물에 대한 알림을 받을 것입니다.」가, 다시 누르면 「받지 않게 될 것입니다.」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    켬안내: z.string().describe('알림을 켤 때 스낵바 글').default('새로운 게시물에 대한 알림을 받을 것입니다.'),
    끔안내: z.string().describe('알림을 끌 때 스낵바 글').default('받지 않게 될 것입니다.'),
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
    await test.step('팔로우 중인 mute_jang 프로필에서 알림 종 버튼을 두 번 누른다', async () => {
      await 프로필열기(driver, 'mute_jang');
      await verify('알림 종 버튼이 보인다', await 뜰때까지(driver, 프로필.알림종, 10_000), true, { blocker: true });
      await driver.$(프로필.알림종).click();
      누른횟수 += 1;
      const 켬글 = await 스낵바글기다리기(driver, expected.켬안내);
      const 켬 = await verify('알림을 켜는 안내 스낵바가 보인다', 켬글.includes(expected.켬안내), true);
      await driver.$(프로필.알림종).click();
      누른횟수 += 1;
      const 끔글 = await 스낵바글기다리기(driver, expected.끔안내);
      const 끔 = await verify('알림을 끄는 안내 스낵바가 보인다', 끔글.includes(expected.끔안내), true);
      await verify('알림 종 버튼을 누르면 스낵바 「새로운 게시물에 대한 알림을 받을 것입니다.」가, 다시 누르면 「받지 않게 될 것입니다.」가 보인다', 켬 && 끔, true);
    });
  } finally {
    if (누른횟수 % 2 === 1) await driver.$(프로필.알림종).click();
  }
});

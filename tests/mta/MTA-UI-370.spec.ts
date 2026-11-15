import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 확인창 } from './components/dialog.component.js';

export const spec = defineCase({
  tcId: 'MTA-UI-370',
  name: '「Remove follower」를 누르면 「Remove follower?」 확인 창이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    묻는글: z.string().describe('팔로워 제거 확인 창 글').default('Remove follower?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 창 = new 확인창(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('fan_ryu 프로필 메뉴에서 「Remove follower」를 누른다', async () => {
    await 프로필열기(driver, 'fan_ryu');
    await 프로필.메뉴열기();
    await 프로필.메뉴항목누르기('Remove follower');
    await verify('「Remove follower」를 누르면 「Remove follower?」 확인 창이 뜬다', await 뜰때까지(driver, 창.안의글자(expected.묻는글), 10_000), true);
    await driver.back();
  });
});

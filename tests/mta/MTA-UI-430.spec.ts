import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 계정알림설정화면 } from './pages/set-notif.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-430',
  name: '「알림 받기」는 「누구나」 · 「나를 팔로우하는 사람들」 · 「내가 팔로우하는 사람들」 · 「알림 받지않기」 가운데 고른다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 알림 = new 계정알림설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('설정에서 알림 설정을 연다', async () => {
    await 설정.열기();
    await 설정.계정줄누르기();
    await 계정설정.줄누르기('알림');
    await verify('알림 설정 화면에 「알림 받기」 줄이 보인다', await 알림.떴나(), true, { blocker: true });
  });
  await test.step('알림 설정에서 「알림 받기」를 누른다', async () => {
    await 알림.줄누르기('알림 받기');
    const 누구나 = await verify('선택지 「누구나」가 보인다', (await 알림.선택지수('누구나')) >= 2, true);
    const 나를 = await verify('선택지 「나를 팔로우하는 사람들」이 보인다', await 알림.선택지보이나('나를 팔로우하는 사람들'), true);
    const 내가 = await verify('선택지 「내가 팔로우하는 사람들」이 보인다', await 알림.선택지보이나('내가 팔로우하는 사람들'), true);
    const 받지않기 = await verify('선택지 「알림 받지않기」가 보인다', await 알림.선택지보이나('알림 받지않기'), true);
    await verify('「알림 받기」는 「누구나」 · 「나를 팔로우하는 사람들」 · 「내가 팔로우하는 사람들」 · 「알림 받지않기」 가운데 고른다', 누구나 && 나를 && 내가 && 받지않기, true);
    await 알림.창닫기();
  }, { capture: true });
});

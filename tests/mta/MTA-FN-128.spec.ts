import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 승인누르기까지 } from './helpers/signup-flow.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 알림권한창 } from './pages/notify-permission.page.js';
import { 시작화면 } from './pages/start.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-128',
  name: '알림 권한을 거부한 채 하단 「알림」 탭을 누르면 알림 목록이 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 권한 = new 알림권한창(driver);
  const 홈 = new 홈화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('새 앱에서 로그인해 알림 권한 창을 연다', async () => {
    await 승인누르기까지(driver, params.loginId, params.loginPassword);
    await verify('알림 권한 창이 뜬다', await 권한.떴나(), true, { blocker: true });
  });

  await test.step('알림 권한을 거부한 채 하단 「알림」 탭을 누른다', async () => {
    await 권한.답하기('거부');
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 홈.탭.누르기('알림');
    await verify('알림 권한을 거부한 채 하단 「알림」 탭을 누르면 알림 목록이 보인다', await 권한.알림화면떴나(), true);
  });
});

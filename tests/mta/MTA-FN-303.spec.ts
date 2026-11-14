import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱다시켜기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-303',
  name: '알림 「멘션」 탭을 고르고 앱을 다시 켜면 알림 탭 마지막 선택은 계정별로 기억한다',
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
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('알림 「멘션」 탭을 고르고 앱을 다시 켠다', async () => {
    try {
      await 알림.열기();
      await 알림.멘션탭열기();
      await 앱다시켜기(driver);
      await 홈.떴나(60_000);
      await 알림.열기();
      await verify('알림 「멘션」 탭을 고르고 앱을 다시 켜면 알림 탭 마지막 선택은 계정별로 기억한다', await 알림.선택됨('멘션'), 'true');
    } finally {
      await 알림.모든것탭열기();
    }
  }, { capture: true });
});

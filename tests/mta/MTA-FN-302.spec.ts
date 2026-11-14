import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-302',
  name: '알림 화면에서 「멘션」 탭을 누르면 알림 「멘션」 탭은 멘션 종류만 보인다',
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

  await test.step('알림 화면에서 「멘션」 탭을 누른다', async () => {
    try {
      await 알림.열기();
      await 알림.멘션탭열기();
      const 판정1 = await verify('「멘션」 탭에 멘션 종류의 알림 줄이 하나 이상 보인다', (await 알림.멘션줄수()) >= 1, true);
      const 판정2 = await verify('「멘션」 탭에 멘션이 아닌 종류의 알림 줄이 보이지 않는다', await 알림.멘션아닌줄수(), 0);
      await verify('알림 화면에서 「멘션」 탭을 누르면 알림 「멘션」 탭은 멘션 종류만 보인다', 판정1 && 판정2, true);
    } finally {
      await 알림.모든것탭열기();
    }
  }, { capture: true });
});

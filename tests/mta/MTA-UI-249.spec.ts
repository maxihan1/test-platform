import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-249',
  name: '알림 요청이 있으면 맨 위에 「필터링된 알림」 줄과 부제 「n 명의 알 수도 있는 사람」이 보인다',
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

  await test.step('「알림」 탭을 연다', async () => {
    await 알림.열기();
    const 판정1 = await verify('알림 목록 맨 위에 「필터링된 알림」 줄이 보인다', await 문구가보이나(driver, '필터링된 알림'), true);
    const 판정2 = await verify('「필터링된 알림」 줄에 부제 「n 명의 알 수도 있는 사람」이 보인다', await 문구가보이나(driver, 'n 명의 알 수도 있는 사람'), true);
    await verify('알림 요청이 있으면 맨 위에 「필터링된 알림」 줄과 부제 「n 명의 알 수도 있는 사람」이 보인다', 판정1 && 판정2, true);
  }, { capture: true });
});

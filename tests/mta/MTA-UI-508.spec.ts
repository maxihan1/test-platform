import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자들 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터링된알림화면 } from './pages/notification-requests.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-508',
  name: '알림 요청 개수 배지는 99 초과면 「99+」다',
  platforms: ['android'],
  held: '보류 — 알림 요청이 99건을 넘는 계정',
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
  const 요청 = new 필터링된알림화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('알림 요청이 99건을 넘는 사람을 본다', async () => {
    await 알림.열기();
    await 요청.열기();
    await verify('알림 요청 개수 배지는 99 초과면 「99+」다', (await 글자들(driver, 요청.개수배지들)).includes('99+'), true);
  }, { capture: true });
});

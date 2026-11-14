import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-329',
  name: '알림 목록 끝까지 내리면 이전 알림을 이어 불러온다',
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

  await test.step('알림 목록을 끝까지 내린다', async () => {
    await 알림.열기();
    const 처음 = await 알림.첫줄글();
    await 알림.내리기(8);
    const 판정1 = await verify('끝까지 내린 뒤에도 알림 줄이 보인다', (await 알림.줄글읽기()).length >= 1, true);
    const 판정2 = await verify('처음 보이던 첫 알림 줄이 위로 밀려 보이지 않는다', await 알림.줄글에있나(처음), false);
    await verify('알림 목록 끝까지 내리면 이전 알림을 이어 불러온다', 판정1 && 판정2, true);
  }, { capture: true });
});

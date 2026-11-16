import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-329',
  name: '알림 목록을 끝까지 내리면 이전 알림이 이어서 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
    await verify('알림 글이 보인다', await 뜰때까지(driver, 알림.목록글들, 15_000), true, { blocker: true });
  });

  await test.step('알림 목록을 끝까지 내린다', async () => {
    const 새글 = await 알림.끝까지내리며새글세기();
    await verify('알림 목록을 끝까지 내리면 이전 알림이 이어서 보인다', 새글 > 0, true);
  });
});

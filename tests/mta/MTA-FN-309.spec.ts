import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-309',
  name: '팔로우 요청 알림에서 「확정」을 누르면 「확정」 · 「삭제」 버튼이 사라진다',
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
  });

  await test.step('req_yoon 팔로우 요청 알림에서 「확정」을 누른다', async () => {
    await verify('「확정」 버튼이 보인다', await 뜰때까지(driver, 알림.확정버튼, 15_000), true, { blocker: true });
    await driver.$(알림.확정버튼).click();
    const 확정 = await verify('「확정」 버튼이 사라진다', await 사라질때까지(driver, 알림.확정버튼, 15_000), true);
    const 삭제 = await verify('「삭제」 버튼이 사라진다', await 사라질때까지(driver, 알림.삭제버튼, 15_000), true);
    await verify('팔로우 요청 알림에서 「확정」을 누르면 「확정」 · 「삭제」 버튼이 사라진다', 확정 && 삭제, true);
  });
});

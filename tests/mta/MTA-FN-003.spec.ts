import { defineCase, test, verify } from '@platform/kit';
import { 보이나, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-003',
  name: '알림 화면에서 「모두 읽은 상태로 표시」를 누르면 하단 「알림」 탭 배지가 보이지 않는다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
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

  await test.step('알림 화면에서 「모두 읽은 상태로 표시」를 누른다', async () => {
    await driver.$(알림.모두읽음).click();
    await 사라질때까지(driver, 알림.탭배지숫자, 10_000);
    await verify('알림 화면에서 「모두 읽은 상태로 표시」를 누르면 하단 「알림」 탭 배지가 보이지 않는다', await 보이나(driver, 알림.탭배지숫자), false);
  });
});

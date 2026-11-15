import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 알림요청화면 } from './pages/notification-requests.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-267',
  name: '「필터링된 알림」 화면 줄마다 이름 · 「@계정」 · 개수 배지와 허용 · 해제 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    골뱅이: z.string().describe('계정 글이 시작하는 글자').default('@'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);
  const 요청 = new 알림요청화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('「필터링된 알림」 줄을 누른다', async () => {
    await verify('「필터링된 알림」 줄이 보인다', await 뜰때까지(driver, 알림.필터링줄, 15_000), true, { blocker: true });
    await 알림.필터링줄열기();
    await verify('「필터링된 알림」 화면 줄이 보인다', await 요청.그려질때까지(), true, { blocker: true });
    const 이름 = await verify('이름이 보인다', await 뜰때까지(driver, 요청.첫이름, 10_000), true);
    const 계정 = await verify('계정 글이 「@」로 시작한다', (await driver.$(요청.첫계정).getText()).startsWith(expected.골뱅이), true);
    const 배지 = await verify('개수 배지가 보인다', await 뜰때까지(driver, 요청.첫배지, 10_000), true);
    const 허용 = await verify('허용 버튼이 보인다', await 뜰때까지(driver, 요청.허용버튼, 10_000), true);
    const 해제 = await verify('해제 버튼이 보인다', await 뜰때까지(driver, 요청.해제버튼, 10_000), true);
    await verify('「필터링된 알림」 화면 줄마다 이름 · 「@계정」 · 개수 배지와 허용 · 해제 버튼이 보인다', 이름 && 계정 && 배지 && 허용 && 해제, true);
  });
});

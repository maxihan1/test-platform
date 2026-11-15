import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-249',
  name: '알림 화면 맨 위에 「필터링된 알림」 줄과 「명의 알 수도 있는 사람」 부제가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    줄제목: z.string().describe('맨 위 줄 제목').default('필터링된 알림'),
    부제: z.string().describe('맨 위 줄 부제에 든 글').default('명의 알 수도 있는 사람'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('알림 화면 맨 위를 확인한다', async () => {
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
    await verify('맨 위 줄이 보인다', await 뜰때까지(driver, 알림.필터링줄, 15_000), true, { blocker: true });
    const 줄 = await verify('맨 위 줄 제목이 기대값과 같다', await driver.$(알림.필터링줄).getText(), expected.줄제목);
    const 부제 = await verify('맨 위 줄 부제에 기대 글이 든다', (await driver.$(알림.필터링부제).getText()).includes(expected.부제), true);
    await verify('알림 화면 맨 위에 「필터링된 알림」 줄과 「명의 알 수도 있는 사람」 부제가 보인다', 줄 && 부제, true);
  });
});

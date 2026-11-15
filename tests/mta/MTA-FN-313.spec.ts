import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-313',
  name: '「가 당신의 게시물을 인용했습니다:」 인용 알림을 누르면 그 글 상세가 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    인용글: z.string().describe('인용 알림 글').default('가 당신의 게시물을 인용했습니다:'),
    계정: z.string().describe('인용한 글쓴이 계정').default('@jiho_cafe'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);
  const 글상세 = new 글상세화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('jiho_cafe 의 인용 알림을 누른다', async () => {
    const 줄 = 알림.목록글자포함(expected.인용글);
    await verify('인용 알림이 보인다', await 뜰때까지(driver, 줄, 15_000), true, { blocker: true });
    await driver.$(줄).click();
    const 열림 = await verify('글 상세 화면이 열린다', await 글상세.그려질때까지(), true);
    const 글쓴이 = await verify('글쓴이 계정이 기대값을 포함한다', (await driver.$(글상세.시간과계정).getText()).includes(expected.계정), true);
    await verify('「가 당신의 게시물을 인용했습니다:」 인용 알림을 누르면 그 글 상세가 열린다', 열림 && 글쓴이, true);
  });
});

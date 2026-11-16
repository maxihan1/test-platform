import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-206',
  name: '공개 범위 시트 위에 「Control who can interact with this post.」로 시작하는 설명이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    설명머리: z.string().describe('시트 설명이 시작하는 글').default('Control who can interact with this post.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 시트 = new 공개범위시트(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('공개 범위 시트를 연다', async () => {
    await driver.$(글쓰기.공개범위버튼).click();
    await verify('공개 범위 시트가 열린다', await 시트.그려질때까지(), true, { blocker: true });

    await verify('공개 범위 시트 위에 「Control who can interact with this post.」로 시작하는 설명이 보인다', (await 시트.설명글()).startsWith(expected.설명머리), true);
  });
});

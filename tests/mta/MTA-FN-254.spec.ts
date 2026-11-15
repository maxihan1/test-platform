import { defineCase, test, verify } from '@platform/kit';
import { 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-254',
  name: '공개 범위 시트에서 「팔로워」를 고르고 「저장」을 누르면 도구 줄 버튼이 「팔로워」로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    팔로워: z.string().describe('고를 공개 범위').default('팔로워'),
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

  await test.step('공개 범위를 「팔로워」로 저장한다', async () => {
    await driver.$(글쓰기.공개범위버튼).click();
    await verify('공개 범위 시트가 열린다', await 시트.그려질때까지(), true, { blocker: true });

    await 시트.공개고르기(expected.팔로워);
    await 시트.저장하기();
    await 사라질때까지(driver, 시트.저장, 10_000);
    await verify('공개 범위 시트에서 「팔로워」를 고르고 「저장」을 누르면 도구 줄 버튼이 「팔로워」로 보인다', (await 글쓰기.공개범위표시()).startsWith(expected.팔로워), true);
  });
});

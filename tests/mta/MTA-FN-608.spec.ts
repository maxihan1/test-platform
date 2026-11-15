import { defineCase, test, verify } from '@platform/kit';
import { 권한창답하기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-608',
  name: '로그인부터 미디어 첨부까지 앱을 쓰면 카메라 · 마이크 · 위치 권한 창이 뜨지 않는다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  held: '보류 — 앱이 요청한 권한 목록을 앱 밖에서 읽을 길이 없다',
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('로그인부터 미디어 첨부까지 앱을 쓴다', async () => {
    await driver.$(홈.글쓰기).click();
    await verify('글쓰기 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    await driver.$(글쓰기.미디어추가).click();
    await verify('로그인부터 미디어 첨부까지 앱을 쓰면 카메라 · 마이크 · 위치 권한 창이 뜨지 않는다', await 권한창답하기(driver, '거부', 3_000), false);
  });
});

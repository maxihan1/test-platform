import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-168',
  name: '새 글쓰기 상단에 닫기 · 「새 게시물」 · 「게시」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('글쓰기 상단 제목').default('새 게시물'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('글쓰기 화면을 연다', async () => {
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    const 닫기 = await verify('닫기 버튼이 보인다', await 뜰때까지(driver, 글쓰기.닫기, 10_000), true);
    const 제목 = await verify('상단 제목이 기대값과 같다', await driver.$(글쓰기.제목글).getText(), expected.제목);
    const 게시 = await verify('「게시」 버튼이 보인다', await 뜰때까지(driver, 글쓰기.게시, 10_000), true);
    await verify('새 글쓰기 상단에 닫기 · 「새 게시물」 · 「게시」가 보인다', 닫기 && 제목 && 게시, true);
  });
});

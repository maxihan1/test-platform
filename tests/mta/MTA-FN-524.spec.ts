import { defineCase, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 텍스트공유하기 } from './helpers/signup-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-524',
  name: '제목과 본문을 텍스트로 공유하면 글쓰기 본문에 제목, 줄바꿈, 본문 순서로 채워진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    제목: z.string().describe('공유할 제목 — 한 줄 글').default('공유 제목'),
    본문: z.string().describe('공유할 본문 — 한 줄 글').default('공유 본문'),
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

  await test.step('다른 앱이 제목과 본문을 텍스트로 공유한다', async () => {
    await 텍스트공유하기(driver, params.제목, params.본문);
    await verify('글쓰기 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    await 될때까지(driver, async () => (await driver.$(글쓰기.본문).getText()).startsWith(params.제목), 10_000);
    await verify('제목과 본문을 텍스트로 공유하면 글쓰기 본문에 제목, 줄바꿈, 본문 순서로 채워진다', await driver.$(글쓰기.본문).getText(), `${params.제목}\n${params.본문}`);
  });
});

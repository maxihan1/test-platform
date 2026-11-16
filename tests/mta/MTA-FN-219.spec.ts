import { defineCase, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-219',
  name: '열람 주의 칸에 두 글자 · 본문에 한 글자를 적으면 남은 글자 수가 「497」로 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    경고: z.string().min(1).describe('열람 주의 칸에 적을 글 — 두 글자').default('가나'),
    본문: z.string().min(1).describe('본문에 적을 글 — 한 글자').default('다'),
  }),
  expected: z.object({
    처음글자수: z.string().describe('글쓰기를 막 열었을 때 남은 글자 수').default('500'),
    남은글자: z.string().describe('세 글자를 적은 뒤 남은 글자 수').default('497'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('열람 주의 칸에 두 글자 · 본문에 한 글자를 적는다', async () => {
    await verify('경고 칸이 보인다', await 글쓰기.열람주의열기(), true, { blocker: true });
    await 글쓰기.경고적기(params.경고);
    await 글쓰기.본문적기(params.본문);
    await 될때까지(driver, async () => (await 글쓰기.남은글자()) !== expected.처음글자수, 10_000);
    await verify('열람 주의 칸에 두 글자 · 본문에 한 글자를 적으면 남은 글자 수가 「497」로 보인다', await 글쓰기.남은글자(), expected.남은글자);
  });
});

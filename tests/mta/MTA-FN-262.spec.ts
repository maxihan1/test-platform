import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 포커스칸에치기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-262',
  name: '글쓰기 본문에 「@」 뒤에 글자를 이어 적으면 계정 자동 완성 줄이 뜬다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글자: z.string().min(2).describe('본문에 적을 글자 — 골뱅이 뒤에 계정 첫 글자').default('@q'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('글쓰기 본문에 「@q」를 적는다', async () => {
    await driver.$(글쓰기.본문).click();
    await 포커스칸에치기(driver, params.글자);
    await verify('글쓰기 본문에 「@」 뒤에 글자를 이어 적으면 계정 자동 완성 줄이 뜬다', await 뜰때까지(driver, 글쓰기.자동완성계정줄, 10_000), true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 인용글쓰기열기 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-172',
  name: '글쓰기 본문 힌트가 「당신의 생각을 입력하거나 붙여넣으세요」이고 인용 글쓰기 힌트는 「대화에 무언가를 추가하세요」로 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글일부: z.string().min(1).describe('인용할 minjun_dev 글의 일부 — 그 글을 찾는 낱말').default('마스토돈 4.7 인용 기능'),
  }),
  expected: z.object({
    본문힌트: z.string().describe('글쓰기 본문 힌트').default('당신의 생각을 입력하거나 붙여넣으세요'),
    인용힌트: z.string().describe('인용 글쓰기 본문 힌트').default('대화에 무언가를 추가하세요'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('글쓰기 화면을 열고 인용 글쓰기를 연다', async () => {
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    const 본문힌트 = await verify('글쓰기 본문 힌트가 기대값과 같다', await 글쓰기.본문글(), expected.본문힌트);
    await 글쓰기.나가기();
    await 홈.그려질때까지();
    await 인용글쓰기열기(driver, 'minjun_dev', params.글일부);
    await verify('인용 글쓰기 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    const 인용힌트 = await verify('인용 글쓰기 힌트가 기대값과 같다', await 글쓰기.본문글(), expected.인용힌트);
    await verify('글쓰기 본문 힌트가 「당신의 생각을 입력하거나 붙여넣으세요」이고 인용 글쓰기 힌트는 「대화에 무언가를 추가하세요」로 보인다', 본문힌트 && 인용힌트, true);
  });
});

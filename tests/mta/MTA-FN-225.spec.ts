import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-225',
  name: '본문과 투표 항목 1개에만 값을 적으면 「게시」가 꺼져 있다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    본문: z.string().min(1).describe('본문에 적을 글').default('투표 본문'),
    첫항목: z.string().min(1).describe('투표 첫째 항목에 적을 글').default('첫째 항목'),
    둘째항목: z.string().min(1).describe('투표 둘째 항목에 적을 글').default('둘째 항목'),
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

  await test.step('투표 항목 1개에만 값을 적는다', async () => {
    await 글쓰기.본문적기(params.본문);
    await verify('투표 영역이 보인다', await 글쓰기.투표열기(), true, { blocker: true });
    await 글쓰기.투표항목적기(0, params.첫항목);
    await 될때까지(driver, async () => (await 글쓰기.투표항목글(0)) === params.첫항목, 10_000);
    await verify('본문과 투표 항목 1개에만 값을 적으면 「게시」가 꺼져 있다', await 글쓰기.꺼졌나(글쓰기.게시), true);
  });

  await test.step('투표 항목 2개에 값을 적는다', async () => {
    await 글쓰기.투표항목적기(1, params.둘째항목);
    await verify('투표 항목 2개에서는 「게시」가 켜진다', await 뜰때까지(driver, 글쓰기.게시켜짐, 10_000), true);
  });
});

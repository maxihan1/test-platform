import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 목록안글자포함 } from './helpers/app.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 내글모두지우기 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-265',
  name: '글쓰기 「게시」를 빠르게 두 번 누르면 내 프로필에 그 글이 한 건만 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    건수: z.number().int().describe('내 프로필에 보이는 그 글의 수').default(1),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 본문 = 표시글('두 번 누르기 확인');
  const 글쓰기 = new 글쓰기화면(driver);
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);

  try {
    await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    });

    await test.step('글쓰기 「게시」를 빠르게 두 번 누른다', async () => {
      await 글쓰기.본문적기(본문);
      await verify('「게시」가 켜진다', await 뜰때까지(driver, 글쓰기.게시켜짐, 10_000), true, { blocker: true });
      await 글쓰기.게시두번누르기();
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(30_000), true, { blocker: true });
      await driver.$(홈.탭.프로필).click();
      await verify('내 프로필이 보인다', await 프로필.그려질때까지(), true, { blocker: true });
      await verify('올린 글이 보인다', await 뜰때까지(driver, 목록안글자포함(본문), 20_000), true, { blocker: true });
      await verify('글쓰기 「게시」를 빠르게 두 번 누르면 내 프로필에 그 글이 한 건만 보인다', (await driver.$$(목록안글자포함(본문)).getElements()).length, expected.건수);
    });
  } finally {
    await 내글모두지우기(driver, 본문);
  }
});

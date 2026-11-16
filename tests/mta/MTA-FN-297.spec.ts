import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글, 내글쓰기, 내프로필에서글열기, 내글지우기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 수정내역화면 } from './pages/edit-history.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-297',
  name: '내 글 본문을 고친 뒤 수정 내역을 열면 「원본 게시물」과 「내용을 수정함」이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 수정내역 = new 수정내역화면(driver);
  const 원본 = 표시글('수정 전');
  const 고친글 = 표시글('수정 후');
  let 본문 = 원본;

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('내 새 글 본문을 고친 뒤 수정 내역을 연다', async () => {
      await 내글쓰기(driver, 원본);
      await 내프로필에서글열기(driver, 원본);
      await 글상세.더보기열기();
      await 글상세.메뉴.고르기('수정');
      await verify('수정 글쓰기가 열린다', await 글쓰기.그려질때까지(), true, { blocker: true });
      await 글쓰기.본문적기(고친글);
      await 뜰때까지(driver, 글쓰기.게시켜짐, 10_000);
      await driver.$(글쓰기.게시).click();
      본문 = 고친글;
      if (!(await 뜰때까지(driver, 글상세.목록글자포함('마지막 수정'), 8_000))) await 내프로필에서글열기(driver, 고친글);
      await driver.$(글상세.목록글자포함('마지막 수정')).click();
      const 원본표시 = await verify('「원본 게시물」이 보인다', await 수정내역.글자가뜰때까지('원본 게시물'), true);
      const 수정표시 = await verify('「내용을 수정함」이 보인다', await 수정내역.글자가뜰때까지('내용을 수정함'), true);
      await verify('내 글 본문을 고친 뒤 수정 내역을 열면 「원본 게시물」과 「내용을 수정함」이 보인다', 원본표시 && 수정표시, true);
    });
  } finally {
    await 내글지우기(driver, 본문);
  }
});

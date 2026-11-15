import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글, 내글쓰기 } from './helpers/post.helper.js';
import { 내글수정열기, 내글모두지우기 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-268',
  name: '글 수정 중 뒤로 가면 「변경 사항을 지우시겠습니까?」 창이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    고친글: z.string().min(1).describe('수정 화면 본문 뒤에 덧붙일 글').default(' 고침'),
  }),
  expected: z.object({
    제목: z.string().describe('확인 창 제목').default('변경 사항을 지우시겠습니까?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 본문 = 표시글('수정 중 뒤로 가기 확인');
  const 글쓰기 = new 글쓰기화면(driver);
  const 홈 = new 홈화면(driver);

  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });

    await test.step('내 새 글을 올리고 수정 화면을 연다', async () => {
      await 내글쓰기(driver, 본문);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await 내글수정열기(driver, 본문);
      await verify('글 수정 화면 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    });

    await test.step('내 새 글 수정 화면에서 본문을 고치고 뒤로 간다', async () => {
      await 글쓰기.본문적기(본문 + params.고친글);
      await driver.back();
      await verify('글 수정 중 뒤로 가면 「변경 사항을 지우시겠습니까?」 창이 뜬다', await 뜰때까지(driver, 글쓰기.창.안의글자(expected.제목), 10_000), true);
      await 글쓰기.창.확인();
    });
  } finally {
    await 내글모두지우기(driver, 본문);
  }
});

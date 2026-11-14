import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글남김없이지우기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기, 테스트글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-605',
  name: '언어를 고르지 않으면 언어를 보내지 않는다',
  platforms: ['android'],
  held: '보류 — 앱이 서버로 보내는 글 요청을 읽을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  const 본문 = 테스트글('언어 미선택');
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('언어를 고르지 않고 게시한다', async () => {
      await 글쓰기.본문적기(본문);
      await 글쓰기.게시누르기();
      await verify('언어를 고르지 않으면 언어를 보내지 않는다', await 홈.떴나(60_000), true);
    }, { capture: true });
  } finally {
    await 내글남김없이지우기(driver, 본문);
  }
});

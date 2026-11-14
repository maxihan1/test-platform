import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글이될때까지, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-216',
  name: '글쓰기 본문에 URL 하나를 적으면 URL 하나는 23자로 센다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주소: z.string().min(24).describe('적을 URL — 24자 이상').default('https://mastodon.maxihan.com/about/more-than-23-chars'),
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
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('글쓰기 본문에 URL 하나를 적는다', async () => {
      await 글쓰기.본문적기(params.주소);
      await verify('글쓰기 본문에 URL 하나를 적으면 URL 하나는 23자로 센다', await 글이될때까지(driver, 글쓰기.글자수, String(500 - 23)), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});

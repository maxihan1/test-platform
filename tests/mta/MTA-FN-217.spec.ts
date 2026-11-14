import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글이될때까지, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-217',
  name: '글쓰기 본문에 @qa_user2@mastodon.maxihan.com 을 적으면 멘션 @이름@도메인은 @이름만 센다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    멘션: z.string().describe('적을 멘션 — @이름@도메인 꼴').default('@qa_user2@mastodon.maxihan.com'),
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
    await test.step('글쓰기 본문에 @qa_user2@mastodon.maxihan.com 을 적는다', async () => {
      await 글쓰기.본문적기(params.멘션);
      await verify('글쓰기 본문에 @qa_user2@mastodon.maxihan.com 을 적으면 멘션 @이름@도메인은 @이름만 센다', await 글이될때까지(driver, 글쓰기.글자수, String(500 - params.멘션.slice(0, params.멘션.indexOf('@', 1)).length)), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});

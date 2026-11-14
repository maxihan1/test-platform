import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나, 보이나 } from './helpers/app.helper.js';
import { 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-168',
  name: '새 글쓰기 상단에 닫기 · 제목 「새 게시물」 · 「게시」가 보인다',
  platforms: ['android'],
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
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
      const 닫기 = await verify('글쓰기 상단에 닫기가 보인다', await 보이나(driver, 글쓰기.닫기), true);
      const 제목 = await verify('글쓰기 상단에 제목 「새 게시물」이 보인다', await 문구가보이나(driver, '새 게시물'), true);
      const 게시 = await verify('글쓰기 상단에 「게시」가 보인다', await 보이나(driver, 글쓰기.게시), true);
      await verify('새 글쓰기 상단에 닫기 · 제목 「새 게시물」 · 「게시」가 보인다', 닫기 && 제목 && 게시, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});

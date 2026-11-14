import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-262',
  name: '글쓰기에 @ · # · :를 입력하면 자동 완성 줄(「찾고자 하는 대상을 찾아보세요」 · 「이모지 찾아보기」)이 뜬다',
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
    });
    await test.step('글쓰기 본문에 「@qa」를 적는다', async () => {
      await 글쓰기.본문적기('@qa');
      const 대상 = await verify('「@」를 입력한 뒤 「찾고자 하는 대상을 찾아보세요」 줄이 뜬다', await 문구가보이나(driver, '찾고자 하는 대상을 찾아보세요'), true);
      await 글쓰기.본문지우기();
      await 글쓰기.본문적기(':');
      const 에모지 = await verify('「:」를 입력한 뒤 「이모지 찾아보기」 줄이 뜬다', await 문구가보이나(driver, '이모지 찾아보기'), true);
      await verify('글쓰기에 @ · # · :를 입력하면 자동 완성 줄(「찾고자 하는 대상을 찾아보세요」 · 「이모지 찾아보기」)이 뜬다', 대상 && 에모지, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 속성이될때까지, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-221',
  name: '본문(공백 제외)과 미디어가 둘 다 없으면 「게시」가 비활성이다',
  platforms: ['android'],
  techniques: ['결정 테이블'],
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
    await test.step('글쓰기를 열고 아무것도 적지 않는다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
      const 빈칸 = await verify('본문과 미디어가 없을 때 「게시」가 비활성이다', await 속성이될때까지(driver, 글쓰기.게시, 'enabled', 'false'), true);
      await 글쓰기.본문적기('   ');
      const 공백 = await verify('본문에 공백만 적어도 「게시」가 비활성이다', await 속성이될때까지(driver, 글쓰기.게시, 'enabled', 'false'), true);
      await verify('본문(공백 제외)과 미디어가 둘 다 없으면 「게시」가 비활성이다', 빈칸 && 공백, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});

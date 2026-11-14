import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글이될때까지, 속성이될때까지, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-211',
  name: '글자 수가 500을 넘치면 남은 글자 수가 음수로 빨갛게 보이고 「게시」가 비활성이다',
  platforms: ['android'],
  techniques: ['결정 테이블'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글자수: z.number().int().min(501).max(1000).describe('적을 글자 수 — 501 이상 1000 이하').default(501),
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
    await test.step('글쓰기 본문에 501자를 적는다', async () => {
      await 글쓰기.본문적기('가'.repeat(params.글자수));
      const 음수 = await verify('남은 글자 수가 음수로 보인다', await 글이될때까지(driver, 글쓰기.글자수, String(500 - params.글자수)), true);
      const 비활성 = await verify('「게시」가 비활성이다', await 속성이될때까지(driver, 글쓰기.게시, 'enabled', 'false'), true);
      await verify('글자 수가 500을 넘치면 남은 글자 수가 음수로 빨갛게 보이고 「게시」가 비활성이다', 음수 && 비활성, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});

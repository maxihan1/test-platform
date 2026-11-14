import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜰때까지 } from './helpers/app.helper.js';
import { 글이될때까지, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-219',
  name: '「열람 주의」를 켜고 경고 칸에 5자를 적으면 내용 경고 글자도 글자 수에 합산한다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글자수: z.number().int().min(1).max(100).describe('경고 칸에 적을 글자 수 — 1 이상 100 이하').default(5),
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
    await test.step('「열람 주의」를 켜고 경고 칸에 5자를 적는다', async () => {
      await 글쓰기.열람주의누르기();
      await verify('경고 입력 칸이 보인다', await 뜰때까지(driver, 글쓰기.경고칸), true, { blocker: true });
      await 글쓰기.경고적기('가'.repeat(params.글자수));
      await verify('「열람 주의」를 켜고 경고 칸에 5자를 적으면 내용 경고 글자도 글자 수에 합산한다', await 글이될때까지(driver, 글쓰기.글자수, String(500 - params.글자수)), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});

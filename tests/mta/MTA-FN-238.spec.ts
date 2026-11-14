import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜰때까지 } from './helpers/app.helper.js';
import { 속성이될때까지, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-238',
  name: '투표가 있으면 「미디어 추가」 버튼이 비활성이다',
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
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('「투표 추가」를 누른 뒤 도구 줄을 본다', async () => {
      await 글쓰기.투표누르기();
      await verify('투표 영역이 보인다', await 뜰때까지(driver, 글쓰기.투표영역), true, { blocker: true });
      await verify('투표가 있으면 「미디어 추가」 버튼이 비활성이다', await 속성이될때까지(driver, 글쓰기.미디어, 'enabled', 'false'), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});

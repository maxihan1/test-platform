import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 보이나 } from './helpers/app.helper.js';
import { 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-176',
  name: '글쓰기 도구 줄에 「미디어 추가」 · 「투표 추가」 · 「에모지」 · 「열람 주의」 · 언어 · 공개 범위가 보인다',
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
      const 미디어 = await verify('글쓰기 도구 줄에 「미디어 추가」가 보인다', await 보이나(driver, 글쓰기.미디어), true);
      const 투표 = await verify('글쓰기 도구 줄에 「투표 추가」가 보인다', await 보이나(driver, 글쓰기.투표), true);
      const 에모지 = await verify('글쓰기 도구 줄에 「에모지」가 보인다', await 보이나(driver, 글쓰기.에모지), true);
      const 열람주의 = await verify('글쓰기 도구 줄에 「열람 주의」가 보인다', await 보이나(driver, 글쓰기.열람주의), true);
      const 언어 = await verify('글쓰기 도구 줄에 언어 버튼이 보인다', await 보이나(driver, 글쓰기.언어), true);
      const 공개범위 = await verify('글쓰기에 공개 범위 버튼이 보인다', await 보이나(driver, 글쓰기.공개범위), true);
      await verify('글쓰기 도구 줄에 「미디어 추가」 · 「투표 추가」 · 「에모지」 · 「열람 주의」 · 언어 · 공개 범위가 보인다', 미디어 && 투표 && 에모지 && 열람주의 && 언어 && 공개범위, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});

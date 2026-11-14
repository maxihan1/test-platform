import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 문구가보이나 } from './helpers/app.helper.js';
import { 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 언어선택화면 } from './pages/language.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-201',
  name: '언어 버튼은 「기본값」 · 「시스템」 · 「감지된」 · 전체 언어 선택 창을 연다',
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
  const 언어창 = new 언어선택화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('글쓰기 도구 줄의 언어 버튼을 누른다', async () => {
      await 언어창.열기();
      const 기본값 = await verify('언어 선택에 「기본값」이 보인다', await 문구가보이나(driver, '기본값'), true);
      const 시스템 = await verify('언어 선택에 「시스템」이 보인다', await 문구가보이나(driver, '시스템'), true);
      const 감지 = await verify('언어 선택에 「감지된」이 보인다', await 문구가보이나(driver, '감지된'), true);
      await verify('언어 버튼은 「기본값」 · 「시스템」 · 「감지된」 · 전체 언어 선택 창을 연다', 기본값 && 시스템 && 감지, true);
      await 뒤로(driver);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});

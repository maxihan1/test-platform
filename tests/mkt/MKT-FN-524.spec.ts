import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-524',
  name: '비밀번호 칸에 21자를 적으면 오류 문구 없이 20자까지만 들어간다',
  techniques: ['경계값 분석'],
  unconfirmed: '기획서와 다름 — 차이 D3: 비밀번호 칸이 20자에서 막혀 21자째가 안 들어가고 오류 문구가 없다 (작성 요청 5873)',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('비밀번호 칸에 21자 「Ab1!Ab1!Ab1!Ab1!Ab1!x」를 적는다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.비밀번호칸.fill('Ab1!Ab1!Ab1!Ab1!Ab1!x');
    await verify(
      '비밀번호 칸에 21자를 적으면 오류 문구 없이 20자까지만 들어간다',
      { 입력값: await 화면.비밀번호칸.inputValue(), 오류문구보임: await 화면.오류문구('password').isVisible() },
      { 입력값: 'Ab1!Ab1!Ab1!Ab1!Ab1!', 오류문구보임: false },
    );
  });
});

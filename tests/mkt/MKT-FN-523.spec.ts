import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-523',
  name: '아이디 칸에 13자를 적으면 오류 문구 없이 12자까지만 들어간다',
  techniques: ['경계값 분석'],
  unconfirmed: '기획서와 다름 — 차이 D2: 아이디 칸이 12자에서 막혀 13자째가 안 들어가고 오류 문구가 없다 (작성 요청 5873)',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('아이디 칸에 13자 「abcdefgh12345」를 적는다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.아이디칸.fill('abcdefgh12345');
    await verify(
      '아이디 칸에 13자를 적으면 오류 문구 없이 12자까지만 들어간다',
      { 입력값: await 화면.아이디칸.inputValue(), 오류문구보임: await 화면.오류문구('loginId').isVisible() },
      { 입력값: 'abcdefgh1234', 오류문구보임: false },
    );
  });
});

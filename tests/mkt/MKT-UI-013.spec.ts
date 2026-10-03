import { defineCase, test, verify } from '@platform/kit';

import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-013',
  name: '아이디 · 이메일 입력칸과 「임시 비밀번호 받기」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 비밀번호찾기화면(page);

  await test.step('비밀번호 찾기 화면을 연다', async () => {
    await 화면.열기();
    await 화면.임시비밀번호받기버튼().waitFor();
    await verify(
      '아이디 · 이메일 입력칸과 「임시 비밀번호 받기」 버튼이 보인다',
      [await 화면.아이디칸().isVisible(), await 화면.이메일칸().isVisible(), await 화면.임시비밀번호받기버튼().isVisible()],
      [true, true, true],
      { blocker: true },
    );
  });
});

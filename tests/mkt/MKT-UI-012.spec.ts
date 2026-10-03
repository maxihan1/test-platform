import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-012',
  name: '로그인 화면에 「로그인 상태 유지」 체크박스와 눌리지 않는 「로그인」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 화면.열기();
    await 화면.로그인버튼().waitFor();
    await verify('「로그인 상태 유지」 체크박스가 보인다', await 화면.로그인유지체크().isVisible(), true, { blocker: true });
    await verify(
      '아이디 · 비밀번호 칸이 비어 있으면 「로그인」 버튼이 눌리지 않는다',
      [await 화면.아이디칸().inputValue(), await 화면.비밀번호칸().inputValue(), await 화면.로그인버튼().isEnabled()],
      ['', '', false],
    );
  });
});

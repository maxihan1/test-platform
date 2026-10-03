import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 공통보충화면 } from './pages/common-misc.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-004',
  name: '비회원 홈 바닥글에 「이용약관」 · 「개인정보처리방침」 링크와 「© 2026 DemoMarket」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 공통보충화면(page);

  await test.step('홈 화면을 연다', async () => {
    await new 홈화면(page).열기();
    await new 머리글(page).장바구니링크().waitFor();
    await verify(
      '바닥글에 「이용약관」 링크와 「개인정보처리방침」 링크가 보인다',
      [await 화면.이용약관링크().isVisible(), await 화면.개인정보처리방침링크().isVisible()],
      [true, true],
      { blocker: true },
    );
    await verify('바닥글에 「© 2026 DemoMarket」 문구가 보인다', await 화면.저작권문구().isVisible(), true);
  });
});

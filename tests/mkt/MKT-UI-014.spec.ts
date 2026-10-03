import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 고객센터화면 } from './pages/support-faq.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-014',
  name: 'FAQ 화면에 분류 탭 「회원」 「주문/결제」 「배송」 「반품/교환」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 고객센터화면(page);
  const 머리 = new 머리글(page);

  await test.step('FAQ 화면을 연다', async () => {
    await 화면.열기();
    await 화면.FAQ제목().waitFor();
    await 머리.로그인링크().waitFor();
    await verify('비회원이다', await 머리.로그인링크().isVisible(), true, { blocker: true });
    await verify(
      'FAQ 화면에 분류 탭 「회원」 「주문/결제」 「배송」 「반품/교환」이 보인다',
      [await 화면.분류탭('회원').isVisible(), await 화면.분류탭('주문/결제').isVisible(), await 화면.분류탭('배송').isVisible(), await 화면.분류탭('반품/교환').isVisible()],
      [true, true, true, true],
    );
  });
});

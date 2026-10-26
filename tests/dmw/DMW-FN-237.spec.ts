import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-237',
  name: '장바구니가 비어 있으면 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 장바구니 = new 장바구니화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);

  try {
    await test.step('빈 장바구니를 연다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 없다', await 장바구니.줄들.count(), 0, { blocker: true });
      const 안내 = await verify('「장바구니가 비어 있습니다」가 보인다', await 장바구니.비었음안내.isVisible(), true);
      const 버튼 = await verify('「쇼핑하러 가기」 버튼이 보인다', await 장바구니.쇼핑하러가기.isVisible(), true);
      await verify('장바구니가 비어 있으면 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다', 안내 && 버튼, true);
    });

    await test.step('상품 한 줄을 담은 장바구니를 연다', async () => {
      await 상품담기(page.request, 상품, 1);
      await 장바구니.열기();
      await verify('장바구니에 줄이 하나 보인다', await 장바구니.줄들.count(), 1, { blocker: true });
      await verify('장바구니에 한 줄이 있으면 「장바구니가 비어 있습니다」가 보이지 않는다', await 장바구니.비었음안내.isVisible(), false);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});

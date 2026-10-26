import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-187',
  name: '더 불러올 상품이 없으면 「마지막 상품입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('상품을 다 불러올 때까지 목록 끝으로 내린다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.끝까지내리기();
    await verify('더 불러올 상품이 없으면 「마지막 상품입니다」가 보인다', await 목록.마지막안내.isVisible(), true);
  });

  await test.step('처음 12개만 불러온 목록 끝을 확인한다', async () => {
    await 목록.열기();
    await verify('상품 카드 12개만 불러와 있다', await 목록.카드수(), 12, { blocker: true });
    await verify('더 불러올 상품이 남아 있으면 「마지막 상품입니다」가 보이지 않는다', await 목록.마지막안내.isVisible(), false);
  });
});

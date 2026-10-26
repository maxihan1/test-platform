import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-192',
  name: '「품절 상품 제외」를 켜면 품절 상품이 목록에서 빠진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('「품절 상품 제외」를 켠다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.품절제외켜기();
    await 목록.카드들.first().waitFor();
    await 목록.끝까지내리기();
    await verify('「품절 상품 제외」를 켜면 품절 상품이 목록에서 빠진다', await 목록.품절카드들.count(), 0);
  });
});

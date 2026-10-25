import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-185',
  name: '상품 목록에 처음 12개가 보인다',
  platforms: ['desktop', 'mobile'],
  smoke: true,
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('상품 목록 처음 화면의 카드 수를 센다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('상품 목록에 처음 12개가 보인다', await 목록.카드수(), 12);
  });

  await test.step('상품 목록 끝까지 내린다', async () => {
    await 목록.다음묶음불러오기();
    await verify('목록 끝까지 내리면 다음 12개가 이어 붙어 24개가 보인다', await 목록.카드수(), 24);
  });
});

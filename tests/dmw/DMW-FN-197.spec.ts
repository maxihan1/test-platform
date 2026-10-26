import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-197',
  name: '조건에 맞는 상품이 없으면 「조건에 맞는 상품이 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('어느 상품도 맞지 않는 조건으로 고른다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.카테고리켜기('도서');
    await 목록.최대가격두기(10000);
    await 목록.빈상태.waitFor();
    await verify('조건에 맞는 상품이 없으면 「조건에 맞는 상품이 없습니다」가 보인다', await 목록.빈상태.isVisible(), true);
  });

  await test.step('상품 하나만 맞는 조건으로 고른다', async () => {
    await 목록.카테고리끄기('도서');
    await 목록.최대가격두기(20000);
    await 목록.카드들.first().waitFor();
    await verify('조건에 맞는 상품이 하나면 카드 한 장이 보인다', await 목록.카드수(), 1);
  });
});

import { defineCase, test, verify } from '@platform/kit';

import { 할인상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-134',
  name: '상품 카드에 이미지 · 상품명 · 가격 · 할인율 · 별점이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 상품목록화면(page);
  const 상품 = await 할인상품(request);
  await 안내창막기(page);

  await test.step('상품 목록 카드를 확인한다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    const 카드 = 목록.카드(상품.name);
    const 이미지 = await verify('이미지가 보인다', await 목록.카드이미지(카드).isVisible(), true);
    const 이름 = await verify('상품명이 보인다', await 목록.카드상품명(카드).isVisible(), true);
    const 가격 = await verify('가격이 보인다', await 목록.카드할인가(카드).isVisible(), true);
    const 할인율 = await verify('할인율이 보인다', await 목록.카드할인율(카드).isVisible(), true);
    const 별점 = await verify('별점이 보인다', await 목록.카드별점(카드).isVisible(), true);
    await verify('상품 카드에 이미지 · 상품명 · 가격 · 할인율 · 별점이 보인다', 이미지 && 이름 && 가격 && 할인율 && 별점, true);
  });
});

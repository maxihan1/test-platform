import { defineCase, test, verify } from '@platform/kit';

import { 전체상품 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-247',
  name: '「낮은 가격순」을 고르면 상품이 가격 낮은 순으로 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 상품들 = await 전체상품(page.request);
  const 가격순 = (방향: 1 | -1): string =>
    상품들
      .map((상품) => 상품.salePrice)
      .sort((앞, 뒤) => (앞 - 뒤) * 방향)
      .join(', ');
  const 리뷰순 = 상품들
    .map((상품) => 상품.reviewCount)
    .sort((앞, 뒤) => 뒤 - 앞)
    .join(', ');

  await test.step('상품 목록을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상품 정렬에서 「낮은 가격순」을 고른다', async () => {
    await 목록.정렬상자.selectOption({ label: '낮은 가격순' });
    await 목록.다시불러오기끝기다리기();
    await 목록.끝까지내리기();
    await verify('「낮은 가격순」을 고르면 상품이 가격 낮은 순으로 보인다', (await 목록.카드가격들()).join(', '), 가격순(1));
  });

  await test.step('상품 정렬에서 「높은 가격순」을 고른다', async () => {
    await 목록.정렬상자.selectOption({ label: '높은 가격순' });
    await 목록.다시불러오기끝기다리기();
    await 목록.끝까지내리기();
    await verify('상품이 가격 높은 순으로 보인다', (await 목록.카드가격들()).join(', '), 가격순(-1));
  });

  await test.step('상품 정렬에서 「리뷰 많은순」을 고른다', async () => {
    await 목록.정렬상자.selectOption({ label: '리뷰 많은순' });
    await 목록.다시불러오기끝기다리기();
    await 목록.끝까지내리기();
    await verify('상품이 리뷰 수 많은 순으로 보인다', (await 목록.카드리뷰수들()).join(', '), 리뷰순);
  });
});

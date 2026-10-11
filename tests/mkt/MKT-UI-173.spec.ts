import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/account.helper.js';
import { 머리글 } from './components/header.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-173',
  name: '상품 목록에 카드가 한 줄에 4개씩 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '화면 너비가 768px 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 목록 화면을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('상품 목록에 카드가 한 줄에 4개씩 보인다', await 목록.첫줄카드수(), 4);
    await verify(
      '상품 카드에 이미지 · 상품명 · 가격 · 할인율 · 별점이 보인다',
      await 목록.할인카드요소보임(),
      ['이미지', '상품명', '가격', '할인율', '별점'],
    );
    await verify(
      '할인 상품 카드는 원래 가격에 가운데 줄이 그어지고 할인 가격이 빨갛게 보인다',
      await 목록.할인카드모양(),
      { 가운데줄: true, 할인가빨강: true },
    );
    await verify('상품 목록에 처음 12개가 보인다', await 목록.카드.count(), 12);
    await verify('「품절 상품 제외」 는 처음에 꺼져 있다', await 목록.품절제외.isChecked(), false);
    await 목록.끝까지내리기();
    await verify('품절 상품 카드에 회색 덮개와 「품절」 표시가 보인다', await 목록.품절덮개모양(), { 글자: '품절', 회색덮개: true });
    await 목록.카드.first().scrollIntoViewIfNeeded();
    await verify(
      '상품 정렬에 「추천순」 · 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」 이 있고 「추천순」 이 골라져 있다',
      { 항목: await 목록.정렬항목들(), 고른것: await 목록.고른정렬() },
      { 항목: ['추천순', '낮은 가격순', '높은 가격순', '리뷰 많은순'], 고른것: '추천순' },
    );
  });

  await test.step('너비 768px 화면으로 상품 목록을 연다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await 목록.열기();
    await verify('화면 너비가 768px 이다', page.viewportSize()?.width, 768, { blocker: true });
    await verify('너비 768px 화면에서는 상품 카드가 한 줄에 2개씩 보인다', await 목록.첫줄카드수(), 2);
  });
});

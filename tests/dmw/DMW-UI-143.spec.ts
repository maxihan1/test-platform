import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-143',
  name: '상품 정렬에 「추천순」 · 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」이 있고 「추천순」이 골라져 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('상품 정렬 선택 상자를 확인한다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    const 선택지 = await verify('정렬 선택지가 「추천순」 · 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」이다', (await 목록.정렬선택지들()).join(' · '), '추천순 · 낮은 가격순 · 높은 가격순 · 리뷰 많은순');
    const 고름 = await verify('골라진 정렬이 「추천순」이다', await 목록.정렬고른글(), '추천순');
    await verify('상품 정렬에 「추천순」 · 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」이 있고 「추천순」이 골라져 있다', 선택지 && 고름, true);
  });
});

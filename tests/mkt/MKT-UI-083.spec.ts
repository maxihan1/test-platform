import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-083',
  name: '상품 정렬에 「추천순」 · 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」이 있다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 목록을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('상품 정렬에 「추천순」 · 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」이 있다', (await 목록.정렬목록()).join(', '), '추천순, 낮은 가격순, 높은 가격순, 리뷰 많은순');
    await verify('상품 정렬은 처음에 「추천순」이 골라져 있다', await 목록.고른정렬(), '추천순');
  });
});

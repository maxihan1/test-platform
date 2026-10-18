import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-165',
  name: '상품 정렬 드롭다운에 「추천순」 · 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」이 있고 「추천순」이 골라져 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('상품 목록의 정렬 드롭다운을 확인한다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    const 옵션들 = (await 목록.정렬옵션들()).join(' · ');
    await verify('상품 정렬 드롭다운에 「추천순」 · 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」이 있고 「추천순」이 골라져 있다', `${옵션들} / ${await 목록.고른정렬()}`, '추천순 · 낮은 가격순 · 높은 가격순 · 리뷰 많은순 / 추천순');
  });
});

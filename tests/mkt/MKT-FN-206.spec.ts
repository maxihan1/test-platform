import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-206',
  name: '상품 목록을 처음 열면 상품 카드가 12개 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('상품 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('상품 목록을 처음 열면 상품 카드가 12개 보인다', await 목록.카드들.count(), 12);
  });

  await test.step('상품 목록 끝까지 내린다', async () => {
    await 목록.끝으로내리기();
    await 목록.카드들.nth(23).waitFor();
    await verify('목록 끝까지 내리면 상품 카드가 24개로 늘어난다', await 목록.카드들.count(), 24);
  });
});

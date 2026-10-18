import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-216',
  name: '「낮은 가격순」을 고르면 상품이 가격 낮은 순으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('정렬 드롭다운에서 「낮은 가격순」을 고른다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.정렬.selectOption({ label: '낮은 가격순' });
    await 목록.목록다시나올때까지();
    const 가격들 = await 목록.카드판매가들읽기();
    await verify('「낮은 가격순」을 고르면 상품이 가격 낮은 순으로 보인다', 가격들.join(', '), [...가격들].sort((앞, 뒤) => 앞 - 뒤).join(', '));
  });
});

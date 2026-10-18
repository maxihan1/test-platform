import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 첫쪽할인상품 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-156',
  name: '할인 상품 카드의 원래 가격에 가운데 줄이 그어지고 할인 가격이 빨간 글자다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('할인 상품 카드의 가격을 확인한다', async () => {
    await 방해창막기(page);
    const 상품 = await 첫쪽할인상품(page.request);
    await 목록.열기();
    const 카드 = 목록.카드(상품.id);
    await 카드.waitFor();
    await verify('상품 목록 화면에 할인 상품 카드가 보인다', await 카드.isVisible(), true, { blocker: true });
    const 줄 = (await 목록.원가에줄이그어졌나(카드)) ? '가운데 줄' : '줄 없음';
    const 색 = (await 목록.판매가가빨간가(카드)) ? '빨강' : '빨강 아님';
    await verify('할인 상품 카드의 원래 가격에 가운데 줄이 그어지고 할인 가격이 빨간 글자다', `${줄}, ${색}`, '가운데 줄, 빨강');
  });
});

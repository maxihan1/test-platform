import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 첫쪽할인상품 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-155',
  name: '상품 카드에 이미지 · 상품명 · 가격 · 할인율 · 별점이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('할인 상품 카드 하나를 확인한다', async () => {
    await 방해창막기(page);
    const 상품 = await 첫쪽할인상품(page.request);
    await 목록.열기();
    const 카드 = 목록.카드(상품.id);
    await 카드.waitFor();
    await verify('상품 목록 화면에 할인 상품 카드가 보인다', await 카드.isVisible(), true, { blocker: true });
    const 부분 = [
      ['이미지', 목록.카드이미지(카드)],
      ['상품명', 목록.카드상품명(카드)],
      ['가격', 목록.카드판매가(카드)],
      ['할인율', 목록.카드할인율(카드)],
      ['별점', 목록.카드별점(카드)],
    ] as const;
    const 보이는 = [];
    for (const [이름, 요소] of 부분) if (await 요소.isVisible()) 보이는.push(이름);
    await verify('상품 카드에 이미지 · 상품명 · 가격 · 할인율 · 별점이 보인다', 보이는.join(' · '), '이미지 · 상품명 · 가격 · 할인율 · 별점');
  });
});

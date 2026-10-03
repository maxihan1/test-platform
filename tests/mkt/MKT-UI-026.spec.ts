import { defineCase, test, verify } from '@platform/kit';

import { 상품상세화면 } from './pages/shop-detail.page.js';

type 상품요약 = { id: number; soldOut: boolean };

export const spec = defineCase({
  tcId: 'MKT-UI-026',
  name: '품절 상품의 상세 화면에 눌리지 않는 「품절」 버튼만 보이고 구매 버튼은 보이지 않는다',
  precondition: ['품절 상품이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 품절상품 = 목록.find((상품) => 상품.soldOut);

  await test.step('품절 상품의 상세 화면을 연다', async () => {
    await verify('품절 상품이 있다', 품절상품 !== undefined, true, { blocker: true });
    await 상세.열기((품절상품 as 상품요약).id);
    await 상세.상품명().waitFor();
    await verify('품절 상품에는 눌리지 않는 「품절」 버튼이 보인다', await 상세.눌리지않는품절버튼().isVisible(), true);
    await verify(
      '품절 상품에는 「장바구니 담기」와 「바로 구매」 버튼이 보이지 않는다',
      [await 상세.장바구니담기버튼().isVisible(), await 상세.바로구매버튼().isVisible()],
      [false, false],
    );
  });
});

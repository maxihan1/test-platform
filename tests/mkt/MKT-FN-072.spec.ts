import { defineCase, test, verify } from '@platform/kit';

import { 상품상세화면 } from './pages/shop-detail.page.js';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; salePrice: number; stock: number; maxQty: number };

export const spec = defineCase({
  tcId: 'MKT-FN-072',
  name: '「+」를 눌러 수량이 최대 10 이 되면 「+」 버튼이 눌리지 않고 「총 상품 금액」이 바뀐다',
  precondition: ['재고가 10개 이상인 상품이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 원 = (금액: number): string => `${금액.toLocaleString('ko-KR')}원`;
  let 대상: 상품상세 | undefined;
  for (const 상품 of 목록.filter((항목) => !항목.soldOut)) {
    const 자세히 = (await (await page.request.get(`/api/products/${상품.id}`)).json()) as 상품상세;
    if (자세히.stock >= 10) {
      대상 = 자세히;
      break;
    }
  }
  const 큰재고상품 = 대상 as 상품상세;

  await test.step('「+」를 눌러 수량을 올린다', async () => {
    await 상세.열기(큰재고상품.id);
    await 상세.상품명().waitFor();
    await verify('재고가 10개 이상인 상품이다', 큰재고상품.stock >= 10, true, { blocker: true });
    await 상세.수량최대까지늘리기(10);
    await 상세.총상품금액이(원(큰재고상품.salePrice * 10)).waitFor();
    await verify(
      '수량이 최대 10 이면 「+」 버튼이 눌리지 않는다',
      [await 상세.수량칸().inputValue(), await 상세.눌리지않는늘리기버튼().isVisible()],
      ['10', true],
    );
    await 상세.눌리지않는늘리기버튼().waitFor();
    await verify(
      '수량을 바꾸면 「총 상품 금액」이 바로 바뀐다',
      await 상세.총상품금액().innerText(),
      `총 상품 금액 ${원(큰재고상품.salePrice * Number(await 상세.수량칸().inputValue()))}`,
    );
  });
});

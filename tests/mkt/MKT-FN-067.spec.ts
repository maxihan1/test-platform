import { defineCase, test, verify } from '@platform/kit';

import { 상품목록화면 } from './pages/shop-list.page.js';

type 상품요약 = { name: string; soldOut: boolean };

export const spec = defineCase({
  tcId: 'MKT-FN-067',
  name: '스위치를 켜면 품절 상품이 목록에서 빠진다',
  precondition: ['품절 상품이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 전체 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 품절이름들 = 전체.filter((상품) => 상품.soldOut).map((상품) => 상품.name);
  const 판매중수 = 전체.length - 품절이름들.length;

  await test.step('「품절 상품 제외」 스위치를 켠다', async () => {
    await 목록.열기();
    await 목록.상품카드들().first().waitFor();
    await verify('품절 상품이 있다', 품절이름들.length > 0, true, { blocker: true });
    await 목록.품절제외스위치().check();
    await 목록.상품카드들().first().waitFor();
    await 목록.끝까지내리기(판매중수);
    const 이름들 = await 목록.카드이름들().allInnerTexts();
    await verify('스위치를 켜면 품절 상품이 목록에서 빠진다', 이름들.filter((이름) => 품절이름들.includes(이름)), []);
  });
});

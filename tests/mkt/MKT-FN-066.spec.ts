import { defineCase, test, verify } from '@platform/kit';

import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-066',
  name: '가격 슬라이더를 150,000원으로 맞추면 「~ 150,000원」이 보이고 그보다 비싼 상품은 빠진다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 상한 = 150000;
  const 맞는수 = ((await (await page.request.get(`/api/products?maxPrice=${상한}&page=1&size=1`)).json()) as { total: number }).total;

  await test.step('가격 슬라이더를 150,000원으로 맞춘다', async () => {
    await 목록.열기();
    await 목록.상품카드들().first().waitFor();
    await 목록.가격맞추기(상한);
    await 목록.상품카드들().first().waitFor();
    await verify('슬라이더 옆에 「~ 150,000원」이 보인다', await 목록.가격표시().innerText(), '~ 150,000원');
    await 목록.끝까지내리기(맞는수);
    const 가격들 = (await 목록.카드판매가들().allInnerTexts()).map((글) => Number(글.replace(/\D/g, '')));
    await verify(
      '최대 가격을 150,000원으로 정하면 그보다 비싼 상품은 목록에서 빠진다',
      가격들.filter((가격) => 가격 > 상한),
      [],
    );
  });
});

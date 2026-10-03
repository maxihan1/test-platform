import { defineCase, test, verify } from '@platform/kit';

import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-064',
  name: '상품 목록은 처음에 12개가 보이고 끝까지 내리면 이어 붙다가 마지막에 「마지막 상품입니다」가 보인다',
  precondition: ['상품이 13개 이상 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  let 총 = 0;

  await test.step('상품 목록 화면을 열고 목록 끝까지 내린다', async () => {
    await 목록.열기();
    await 목록.상품카드들().first().waitFor();
    총 = Number((await 목록.총개수().innerText()).replace(/\D/g, ''));
    await verify('상품이 13개 이상 있다', 총 >= 13, true, { blocker: true });
    await verify('처음에 상품 12개가 보인다', await 목록.상품카드들().count(), 12);
    await 목록.맨아래카드로내리기();
    await 목록.상품카드들().nth(12).waitFor();
    await verify('목록 끝까지 내리면 다음 상품이 이어 붙는다', await 목록.상품카드들().count(), Math.min(24, 총));
  });

  await test.step('더 불러올 상품이 없을 때까지 내린다', async () => {
    await 목록.끝까지내리기(총);
    await verify('더 불러올 상품이 없으면 「마지막 상품입니다」가 보인다', await 목록.마지막상품문구().isVisible(), true);
  });
});

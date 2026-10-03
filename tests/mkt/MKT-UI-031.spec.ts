import { defineCase, test, verify } from '@platform/kit';

import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-031',
  name: '상품 목록을 불러오는 동안 빈 카드 12개가 보이고 불러오면 실제 상품 카드로 바뀐다',
  precondition: ['상품 목록 응답이 늦게 오는 가짜 응답이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  let 응답보내기: () => void = () => undefined;
  const 응답대기 = new Promise<void>((다음) => {
    응답보내기 = 다음;
  });
  await page.context().route('**/api/products?**', async (route) => {
    await 응답대기;
    await route.continue();
  });

  try {
    await test.step('상품 목록 화면을 연다', async () => {
      await 목록.열기();
      await 목록.빈카드들().first().waitFor();
      await verify('불러오는 동안 빈 카드 12개가 보인다', await 목록.빈카드들().count(), 12);
      응답보내기();
      await 목록.상품카드들().first().waitFor();
      await verify(
        '불러오면 빈 카드가 사라지고 실제 상품 카드 12개가 보인다',
        [await 목록.빈카드들().count(), await 목록.상품카드들().count()],
        [0, 12],
      );
    });
  } finally {
    응답보내기();
    await page.context().unrouteAll({ behavior: 'wait' });
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-032',
  name: '상품 목록을 불러오는 동안 보이는 빈 카드의 바탕이 흰색이다',
  precondition: ['상품 목록 응답이 늦게 오는 가짜 응답이다'],
  params: null,
  expected: null,
  unconfirmed: '기획서와 다름 — 차이 D23: 빈 카드가 회색이 아니라 흰 바탕에 옅은 회색 테두리로 보인다 (작성 요청 5873)',
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
      await verify('상품 목록을 불러오는 동안 보이는 빈 카드의 바탕이 흰색이다', await 목록.빈카드바탕색(), 'rgb(255, 255, 255)');
    });
  } finally {
    응답보내기();
    await page.context().unrouteAll({ behavior: 'wait' });
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 응답붙잡기 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-132',
  name: '상품 목록을 불러오는 동안 회색 빈 카드 12개가 보인다',
  precondition: ['상품 목록 응답이 늦게 온다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  let 붙잡기 = undefined as { 풀기: () => Promise<void> } | undefined;

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  try {
    await test.step('상품 목록 응답을 붙잡아 둔다', async () => {
      붙잡기 = await 응답붙잡기(page, '**/api/products?*');
    });

    await test.step('상품 목록을 연다', async () => {
      await 목록.열기();
      await 목록.빈카드들.first().waitFor();
      await verify('상품 목록 응답이 아직 오지 않았다', await 목록.카드들.count(), 0, { blocker: true });
      await verify('상품 목록을 불러오는 동안 회색 빈 카드 12개가 보인다', await 목록.빈카드들.count(), 12);
    });

    await test.step('상품 목록 응답이 오기를 기다린다', async () => {
      await 붙잡기?.풀기();
      붙잡기 = undefined;
      await 목록.카드들.first().waitFor();
      await verify('상품 목록 응답이 오면 빈 카드가 실제 상품 카드로 바뀐다', (await 목록.빈카드들.count()) === 0 && (await 목록.카드들.count()) > 0, true);
    });
  } finally {
    await 붙잡기?.풀기();
  }
});

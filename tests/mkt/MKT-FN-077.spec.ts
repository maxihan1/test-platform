import { defineCase, test, verify } from '@platform/kit';

import { 응답늦추기 } from './helpers/shop.helper.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-077',
  name: '상품 목록 응답을 기다리는 동안 회색 빈 카드 12개가 먼저 보인다',
  platforms: ['desktop'],
  precondition: ['상품 목록 응답은 늦춘 응답이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 늦춤 = await 응답늦추기(page.context(), /\/api\/products\?/);

  try {
    await test.step('상품 목록 응답을 늦춰 화면을 연다', async () => {
      await 방해막기(page);
      await 목록.응답기다리지않고열기();
      await 목록.스켈레톤.first().waitFor();
      await verify('상품 목록 응답을 기다리는 동안 회색 빈 카드 12개가 먼저 보인다', await 목록.스켈레톤.count(), 12);
    });

    await test.step('상품 목록 응답이 오기를 기다린다', async () => {
      늦춤.놓기();
      await 목록.카드.first().waitFor();
      await verify(
        '상품 목록 응답이 오면 스켈레톤이 실제 카드로 바뀐다',
        { 스켈레톤: await 목록.스켈레톤.count(), 카드있음: (await 목록.카드.count()) > 0 },
        { 스켈레톤: 0, 카드있음: true },
      );
    });
  } finally {
    await 늦춤.풀기();
  }
});

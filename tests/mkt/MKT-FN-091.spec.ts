import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-091',
  name: '목록을 불러오는 동안에는 회색 빈 카드 12개가 먼저 나온다',
  platforms: ['desktop'],
  precondition: ['상품 목록 응답이 늦게 온다(모킹)'],
  params: null,
  expected: z.object({
    skeletonCount: z.number().describe('회색 빈 카드 수').default(12),
    cardCount: z.number().describe('실제 카드 수').default(12),
  }),
});

test(spec, async ({ page, expected }) => {
  const 목록 = new 상품목록(page);
  let 풀기: () => void = () => undefined;
  const 열림 = new Promise<void>((끝) => {
    풀기 = 끝;
  });
  const 붙잡기 = async (route: Route): Promise<void> => {
    await 열림;
    await route.fulfill({ response: await route.fetch() });
  };
  await page.context().route('**/api/products?*', 붙잡기);

  try {
    await test.step('상품 목록 화면을 연다', async () => {
      await 목록.응답없이열기();
      await 목록.빈카드들.first().waitFor();
      await verify('목록을 불러오는 동안에는 회색 빈 카드 12개가 먼저 나온다', await 목록.빈카드들.count(), expected.skeletonCount);
    });

    await test.step('늦춘 응답을 풀어 준다', async () => {
      풀기();
      await 목록.카드들.first().waitFor();
      await verify(
        '목록을 불러오면 회색 빈 카드가 실제 카드로 바뀐다',
        { 빈카드: await 목록.빈카드들.count(), 실제카드: await 목록.카드들.count() },
        { 빈카드: 0, 실제카드: expected.cardCount },
      );
    });
  } finally {
    풀기();
    await page.context().unroute('**/api/products?*', 붙잡기);
  }
});

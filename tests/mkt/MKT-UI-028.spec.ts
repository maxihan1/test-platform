import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-028',
  name: '화면 너비가 768px 이하면 상품 카드가 한 줄에 2개씩 보인다',
  platforms: ['desktop'],
  precondition: ['화면 너비가 768px 이하다'],
  params: z.object({
    width: z.number().describe('화면 너비').default(768),
  }),
  expected: z.object({
    perRow: z.number().describe('한 줄 카드 수').default(2),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 목록 = new 상품목록(page);

  await test.step('상품 목록 화면을 연다', async () => {
    await page.setViewportSize({ width: params.width, height: 900 });
    await 목록.열고기다린다();
    await verify('화면 너비가 768px 이하면 상품 카드가 한 줄에 2개씩 보인다', await 목록.한줄카드수(), expected.perRow);
  });
});

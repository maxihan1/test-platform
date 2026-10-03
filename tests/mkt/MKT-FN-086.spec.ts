import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-086',
  name: '상품 목록은 처음에 12개를 보여 주고 끝까지 내리면 다음 12개를 이어 붙인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    firstCount: z.number().describe('처음 카드 수').default(12),
    secondCount: z.number().describe('한 번 내린 뒤 카드 수').default(24),
    totalCount: z.number().describe('전체 상품 수').default(40),
  }),
});

test(spec, async ({ page, expected }) => {
  const 목록 = new 상품목록(page);

  await test.step('상품 목록 화면에서 목록 끝까지 내린다', async () => {
    await 목록.열고기다린다();
    const 처음 = await 목록.카드들.count();
    await 목록.끝까지내린다(expected.secondCount);
    const 내린뒤 = await 목록.카드들.count();
    await verify(
      '상품 목록은 처음에 12개를 보여 주고 끝까지 내리면 다음 12개를 이어 붙인다',
      [처음, 내린뒤],
      [expected.firstCount, expected.secondCount],
    );
  });

  await test.step('더 불러올 상품이 없을 때까지 목록 끝까지 내린다', async () => {
    await 목록.끝까지내린다(expected.totalCount);
    await 목록.끝안내.waitFor();
    await verify('더 불러올 상품이 없으면 「마지막 상품입니다」가 보인다', await 목록.끝안내.innerText(), '마지막 상품입니다');
  });
});

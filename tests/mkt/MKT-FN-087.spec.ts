import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-087',
  name: '카테고리와 가격과 품절 조건을 고르면 조건에 맞는 상품만 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '카테고리를 하나 골랐다', '품절 상품이 있다'],
  params: z.object({
    maxPrice: z.number().describe('슬라이더 최대 가격').default(150000),
  }),
  expected: z.object({
    twoCategoryTotal: z.string().describe('패션과 도서를 고른 총 개수').default('총 20개'),
    allTotal: z.string().describe('전체 총 개수').default('총 40개'),
    priceLabel: z.string().describe('슬라이더 옆 값').default('~ 150,000원'),
    priceTotal: z.string().describe('최대 가격 이하 총 개수').default('총 13개'),
    priceCount: z.number().describe('최대 가격 이하 카드 수').default(13),
    noSoldOutTotal: z.string().describe('품절 제외 총 개수').default('총 36개'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 목록 = new 상품목록(page);

  await test.step('상품 목록 화면을 연다', async () => {
    await 목록.열고기다린다();
    await verify('상품 목록 화면에 카드가 보인다', await 목록.카드들.first().isVisible(), true, { blocker: true });
  });

  await test.step('카테고리 「패션」과 「도서」를 차례로 고른다', async () => {
    await 목록.카테고리('패션').check();
    await 목록.카테고리('도서').check();
    await 목록.다시그려지기를기다린다();
    await verify('카테고리를 여러 개 고르면 그 카테고리의 상품만 보인다', await 목록.총개수.innerText(), expected.twoCategoryTotal);
  });

  await test.step('고른 카테고리를 모두 해제한다', async () => {
    await 목록.카테고리('패션').uncheck();
    await 목록.카테고리('도서').uncheck();
    await 목록.다시그려지기를기다린다();
    await verify('카테고리를 아무것도 고르지 않으면 전체 상품이 보인다', await 목록.총개수.innerText(), expected.allTotal);
  });

  await test.step('가격 슬라이더를 150,000원으로 옮긴다', async () => {
    await 목록.슬라이더를옮긴다(params.maxPrice);
    await 목록.다시그려지기를기다린다();
    await verify('가격 슬라이더를 옮기면 슬라이더 옆에 「~ 150,000원」처럼 현재 값이 보인다', await 목록.가격표시.innerText(), expected.priceLabel);
    await 목록.끝까지내린다(expected.priceCount);
    const 가격들 = await 목록.카드가격들();
    await verify(
      '가격 슬라이더로 정한 최대 가격 이하의 상품만 보인다',
      { 총개수: await 목록.총개수.innerText(), 모두이하: 가격들.every((가격) => 가격 <= params.maxPrice), 카드수: 가격들.length },
      { 총개수: expected.priceTotal, 모두이하: true, 카드수: expected.priceCount },
    );
  });

  await test.step('「품절 상품 제외」 스위치를 켠다', async () => {
    await 목록.슬라이더를옮긴다(500000);
    await 목록.다시그려지기를기다린다();
    await 목록.품절제외.check();
    await 목록.다시그려지기를기다린다();
    await 목록.끝까지내린다(36);
    await verify(
      '「품절 상품 제외」 스위치를 켜면 품절 상품이 목록에서 빠진다',
      { 총개수: await 목록.총개수.innerText(), 품절카드: await 목록.품절카드들.count() },
      { 총개수: expected.noSoldOutTotal, 품절카드: 0 },
    );
  });
});

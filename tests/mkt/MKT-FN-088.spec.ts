import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-088',
  name: '정렬을 고르면 그 순서로 보이고 조건을 바꾸면 목록이 처음부터 다시 나온다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '목록을 끝까지 내려 상품이 24개 보인다'],
  params: null,
  expected: z.object({
    cheapest: z.string().describe('가장 싼 상품 이름').default('USB-C 허브'),
    priciest: z.string().describe('가장 비싼 상품 이름').default('올리브유 500ml'),
    mostReviewed: z.string().describe('리뷰가 가장 많은 상품 이름').default('클린 코드 이야기'),
    loadedCount: z.number().describe('끝까지 내린 카드 수').default(24),
    firstPageCount: z.number().describe('처음부터 다시 나온 카드 수').default(12),
    twoCategoryTotal: z.string().describe('패션과 도서를 고른 총 개수').default('총 20개'),
  }),
});

function 오름차순인가(값들: number[]): boolean {
  return 값들.every((값, 번호) => 번호 === 0 || (값들[번호 - 1] ?? 0) <= 값);
}

function 내림차순인가(값들: number[]): boolean {
  return 값들.every((값, 번호) => 번호 === 0 || (값들[번호 - 1] ?? 0) >= 값);
}

test(spec, async ({ page, expected }) => {
  const 목록 = new 상품목록(page);

  await test.step('정렬 드롭다운에서 「낮은 가격순」을 고른다', async () => {
    await 목록.열고기다린다();
    await 목록.정렬.selectOption({ label: '낮은 가격순' });
    await 목록.다시그려지기를기다린다();
    const 가격들 = await 목록.카드가격들();
    await verify(
      '「낮은 가격순」을 고르면 가격이 낮은 상품이 먼저 보인다',
      { 오름차순: 오름차순인가(가격들), 첫상품: await 목록.첫카드이름() },
      { 오름차순: true, 첫상품: expected.cheapest },
    );
  });

  await test.step('정렬 드롭다운에서 「높은 가격순」을 고른다', async () => {
    await 목록.정렬.selectOption({ label: '높은 가격순' });
    await 목록.다시그려지기를기다린다();
    const 가격들 = await 목록.카드가격들();
    await verify(
      '「높은 가격순」을 고르면 가격이 높은 상품이 먼저 보인다',
      { 내림차순: 내림차순인가(가격들), 첫상품: await 목록.첫카드이름() },
      { 내림차순: true, 첫상품: expected.priciest },
    );
  });

  await test.step('정렬 드롭다운에서 「리뷰 많은순」을 고른다', async () => {
    await 목록.정렬.selectOption({ label: '리뷰 많은순' });
    await 목록.다시그려지기를기다린다();
    const 리뷰수들 = await 목록.카드리뷰수들();
    await verify(
      '「리뷰 많은순」을 고르면 리뷰가 많은 상품이 먼저 보인다',
      { 내림차순: 내림차순인가(리뷰수들), 첫상품: await 목록.첫카드이름() },
      { 내림차순: true, 첫상품: expected.mostReviewed },
    );
  });

  await test.step('카테고리나 정렬을 바꾼다', async () => {
    await 목록.끝까지내린다(expected.loadedCount);
    await verify('목록을 끝까지 내려 상품이 24개 보인다', await 목록.카드들.count(), expected.loadedCount, { blocker: true });
    await 목록.카테고리('패션').check();
    await 목록.카테고리('도서').check();
    await 목록.다시그려지기를기다린다();
    await verify(
      '필터나 정렬을 바꾸면 목록이 처음부터 다시 나오고 위쪽 「총 {N}개」가 갱신된다',
      { 카드수: await 목록.카드들.count(), 총개수: await 목록.총개수.innerText() },
      { 카드수: expected.firstPageCount, 총개수: expected.twoCategoryTotal },
    );
  });

  await test.step('가격 슬라이더를 0원으로 옮긴다', async () => {
    await 목록.슬라이더를옮긴다(0);
    await 목록.총개수.filter({ hasText: '총 0개' }).waitFor();
    await verify('조건에 맞는 상품이 없으면 「조건에 맞는 상품이 없습니다」가 보인다', await 목록.빈상태.innerText(), '조건에 맞는 상품이 없습니다');
  });
});

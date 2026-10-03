import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품상세 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-096',
  name: '상품명 아래 「{N}명이 보고 있어요」가 5초마다 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '시계를 제어할 수 있다'],
  params: z.object({
    productId: z.number().describe('상품 번호').default(2),
    cycles: z.number().describe('5초씩 돌리는 횟수').default(20),
  }),
  expected: z.object({
    minViewers: z.number().describe('보고 있는 사람 수 최소').default(3),
    maxViewers: z.number().describe('보고 있는 사람 수 최대').default(30),
    minChanges: z.number().describe('값이 바뀐 횟수 최소').default(3),
  }),
});

function 사람수(글자: string): number {
  return Number(/(\d+)명이 보고 있어요/.exec(글자)?.[1] ?? '-1');
}

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 상품상세(page);
  await page.clock.install();

  await test.step('상품 상세 화면을 열고 시계를 5초 앞으로 돌린다', async () => {
    await 상세.열기(params.productId);
    await 상세.시청자수.filter({ hasText: '명이 보고 있어요' }).waitFor();
    let 바뀐횟수 = 0;
    let 중간에그대로 = true;
    for (let 번 = 0; 번 < 6; 번 += 1) {
      const 전 = await 상세.시청자수.innerText();
      await page.clock.runFor(2000);
      if ((await 상세.시청자수.innerText()) !== 전) 중간에그대로 = false;
      await page.clock.runFor(3000);
      if ((await 상세.시청자수.innerText()) !== 전) 바뀐횟수 += 1;
    }
    await verify(
      '상품명 아래 「{N}명이 보고 있어요」가 5초마다 바뀐다',
      { 오초전에는그대로: 중간에그대로, 바뀜: 바뀐횟수 >= expected.minChanges },
      { 오초전에는그대로: true, 바뀜: true },
    );
  });

  await test.step('상품 상세 화면을 열고 시계를 5초씩 여러 번 앞으로 돌린다', async () => {
    await 상세.열기(params.productId);
    await 상세.시청자수.filter({ hasText: '명이 보고 있어요' }).waitFor();
    const 값들: number[] = [사람수(await 상세.시청자수.innerText())];
    for (let 번 = 0; 번 < params.cycles; 번 += 1) {
      await page.clock.runFor(5000);
      값들.push(사람수(await 상세.시청자수.innerText()));
    }
    await verify(
      '「{N}명이 보고 있어요」의 N 은 3에서 30 사이다',
      { 최소이상: Math.min(...값들) >= expected.minViewers, 최대이하: Math.max(...값들) <= expected.maxViewers },
      { 최소이상: true, 최대이하: true },
    );
  });
});

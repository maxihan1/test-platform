import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-205',
  name: '상품 상세에 수량 「−」 · 「+」 버튼과 숫자 칸이 보인다',
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().int().describe('열어 볼 상품 번호 — 품절이 아닌 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 상세를 연다', async () => {
    await 상세.열기(params.productId);
    await 상세.화면기다리기();
    await verify('상품 상세에 수량 「−」 · 「+」 버튼과 숫자 칸이 보인다', [await 상세.줄이기.isVisible(), await 상세.늘리기.isVisible(), await 상세.수량.isVisible()], [true, true, true]);
  });
});

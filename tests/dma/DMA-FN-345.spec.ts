import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 상태로열기 } from './helpers/order.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-345',
  name: '「배송중」 주문 상세에는 「주문 취소」 버튼이 보이지 않는다',
  platforms: ['android'],
  techniques: ['상태 전이'],
  precondition: ['「배송중」 주문이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('그 주문의 주문 상세를 연다', async () => {
    const 상세 = await 상태로열기(driver, '배송중');
    await verify('「배송중」 주문이 있다', 상세 !== undefined, true, { blocker: true });
    if (상세 === undefined) return;
    await verify('「배송중」 주문 상세에는 「주문 취소」 버튼이 보이지 않는다', await 상세.주문취소보이나(), false);
  }, { capture: true });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 주문서값으로 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 취소된주문열기 } from './helpers/order.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-114',
  name: '취소된 주문의 주문 상세에는 「취소 사유 {사유}」가 더 보인다',
  platforms: ['android'],
  precondition: ['취소된 주문이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    product: z.string().describe('취소된 주문이 없을 때 주문할 상품 — 품절이 아닌 상품').default('USB-C 허브'),
    receiver: z.string().describe('주문서 받는 분 — 이름').default('김데모'),
    phone: z.string().describe('주문서 연락처 — 휴대폰 번호').default('01012345678'),
    keyword: z.string().describe('주소 검색어 — 검색 결과가 나오는 도로명').default('테헤란로'),
    detail: z.string().describe('상세 주소 — 아무 글').default('1층'),
    payment: z.enum(['신용카드', '계좌이체', '무통장입금']).describe('결제 수단 — 신용카드 · 계좌이체 · 무통장입금').default('신용카드'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('취소된 주문의 주문 상세를 연다', async () => {
    const 상세 = await 취소된주문열기(driver, params.product, 주문서값으로(params));
    await verify('취소된 주문이 있다', await 상세.상태글(), '주문취소', { blocker: true });
    const 사유줄 = (await 상세.취소사유줄보이나()) ? await 상세.취소사유줄글() : '';
    await verify('취소된 주문의 주문 상세에는 「취소 사유 {사유}」가 더 보인다', /^취소 사유 \S+/.test(사유줄), true);
  }, { capture: true });
});

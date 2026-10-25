import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 맨위줄 } from './components/top-bar.component.js';
import { 주문서값으로 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문만들기, 주문번호로열기 } from './helpers/order.helper.js';
import { 주문내역화면 } from './pages/order-list.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-139',
  name: '주문 상세 버튼 반응',
  platforms: ['android'],
  precondition: ['「결제완료」 주문의 주문 상세가 떠 있다', '「주문 취소」 창이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    product: z.string().describe('주문할 상품 — 품절이 아닌 상품').default('USB-C 허브'),
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
  const 상세 = new 주문상세화면(driver);
  const 내역 = new 주문내역화면(driver);
  let 번호 = '';

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 하나를 주문한다', async () => {
    번호 = await 주문만들기(driver, params.product, 주문서값으로(params));
  });

  await test.step('주문 내역에서 만든 주문의 상세를 열어 상태를 확인한다', async () => {
    await 주문번호로열기(driver, 번호);
    await verify('「결제완료」 주문의 주문 상세가 떠 있다', await 상세.상태글(), '결제완료', { blocker: true });
  });

  await test.step('주문 상세에서 「주문 취소」를 누른다', async () => {
    await 상세.취소창열기().catch(() => undefined);
    await verify('주문 상세에서 「주문 취소」를 누르면 「주문 취소」 창이 뜬다', await 상세.취소창보이나(), true);
  });

  await test.step('「주문 취소」 창에서 「기타」를 누른다', async () => {
    await 상세.사유고르기('기타').catch(() => undefined);
    await 상세.사유글칸.waitForDisplayed({ timeout: 10000 }).catch(() => undefined);
    await verify('「주문 취소」 창에서 「기타」를 누르면 「취소 사유」 입력칸이 나온다', await 상세.사유글칸보이나(), true);
  });

  await test.step('「주문 취소」 창에서 「닫기」를 누른다', async () => {
    await 상세.창닫기().catch(() => undefined);
    await 상세.취소창닫힐때까지().catch(() => undefined);
    await verify('「주문 취소」 창에서 「닫기」를 누르면 창이 닫힌다', await 상세.취소창보이나(), false);
  });

  await test.step('주문 상세에서 「←」를 누른다', async () => {
    await new 맨위줄(driver).뒤로();
    await 내역.열릴때까지().catch(() => undefined);
    await verify('주문 상세에서 「←」를 누르면 주문 내역으로 돌아간다', await 내역.보이나(), true);
  });
});

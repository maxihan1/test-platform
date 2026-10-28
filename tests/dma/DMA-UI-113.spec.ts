import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 주문내역열기 } from './helpers/order.helper.js';
import { 주문내역화면 } from './pages/order-list.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-113',
  name: '「주문 상세」에 주문번호 · 상태 · 「주문일 {날짜}」 · 상품 줄 · 받는 분 · 주소 · 배송 희망일 · 결제 수단 · 금액 줄이 보인다',
  platforms: ['android'],
  precondition: ['주문이 하나 이상 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 내역 = new 주문내역화면(driver);
  const 상세 = new 주문상세화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('주문 내역을 연다', async () => {
    await 주문내역열기(driver);
    await verify('주문이 하나 이상 있다', (await 내역.카드들()).length > 0, true, { blocker: true });
  });

  await test.step('주문 상세를 연다', async () => {
    const 카드 = (await 내역.카드들())[0];
    if (카드 === undefined) return;
    await 내역.주문열기(카드);
    await 상세.열릴때까지().catch(() => undefined);
    const 글 = await 상세.화면글들();
    const 주문번호 = await verify('주문번호가 보인다', await 상세.주문번호.isDisplayed(), true);
    const 상태 = await verify('상태가 보인다', await 상세.상태.isDisplayed(), true);
    const 주문일 = await verify('「주문일 {날짜}」가 보인다', 글.some((칸) => /^주문일 \S+/.test(칸)), true);
    const 상품줄 = await verify('상품 줄이 보인다', (await 상세.상품줄글들()).length > 0, true);
    const 받는분 = await verify('받는 분이 보인다', 글.some((칸) => 칸.includes('받는 분')), true);
    const 주소 = await verify('주소가 보인다', 글.some((칸) => 칸.includes('주소')), true);
    const 배송희망일 = await verify('배송 희망일이 보인다', 글.some((칸) => 칸.includes('배송 희망일')), true);
    const 결제수단 = await verify('결제 수단이 보인다', await 상세.결제수단.isDisplayed(), true);
    const 금액줄 = await verify('금액 줄이 보인다', await 상세.결제금액.isDisplayed(), true);
    await verify(
      '「주문 상세」에 주문번호 · 상태 · 「주문일 {날짜}」 · 상품 줄 · 받는 분 · 주소 · 배송 희망일 · 결제 수단 · 금액 줄이 보인다',
      주문번호 && 상태 && 주문일 && 상품줄 && 받는분 && 주소 && 배송희망일 && 결제수단 && 금액줄,
      true,
    );
  }, { capture: true });
});

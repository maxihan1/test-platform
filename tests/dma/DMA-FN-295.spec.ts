import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 주문서 } from './helpers/checkout-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문만들기 } from './helpers/order.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-295',
  name: '결제 뒤 주문 상세에서 뒤로 가면 상품 목록이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '결제를 마쳐 주문 상세가 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
    받는분: z.string().describe('받는 분 — 공백이 아닌 글').default('김데모'),
    연락처: z.string().describe('연락처 — 숫자 10자나 11자').default('01012345678'),
    검색어: z.string().describe('주소 검색어 — 결과가 1건 이상인 2자 이상의 도로명이나 지역').default('테헤란로'),
    상세주소: z.string().describe('상세 주소 — 공백이 아닌 글').default('1층'),
    결제수단: z.enum(['신용카드', '계좌이체', '무통장입금']).describe('결제 수단 — 세 가지 중 하나').default('신용카드'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 상세 = new 주문상세화면(driver);
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 결제를 마친다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await 주문만들기(
      driver,
      params.상품이름,
      주문서({
        받는분: params.받는분,
        연락처: params.연락처,
        검색어: params.검색어,
        상세주소: params.상세주소,
        결제수단: params.결제수단,
      }),
    );
  });

  await test.step('주문 상세 화면을 확인한다', async () => {
    await verify('결제를 마쳐 주문 상세가 떠 있다', await 상세.보이나(), true, { blocker: true });
  });

  await test.step('기기의 뒤로 가기를 누른다', async () => {
    await driver.back();
    await 목록.열릴때까지().catch(() => undefined);
    await verify('결제 뒤 주문 상세에서 뒤로 가면 상품 목록이 보인다', await 목록.보이나(), true);
  }, { capture: true });
});

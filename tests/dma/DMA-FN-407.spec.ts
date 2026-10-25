import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기오늘 } from './helpers/app.helper.js';
import { 상품상세열기 } from './helpers/cart.helper.js';
import { 결제누르고토스트글, 수량맞추기, 주문서 } from './helpers/checkout-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-407',
  name: '재고가 모자라면 주문하지 않고 재고 부족 문구가 토스트로 보인다',
  platforms: ['android'],
  techniques: ['동등 분할', '결정 테이블'],
  held: '판정 불가 — 재고 부족 문구(REQ-ORD-010)와 재고가 모자란 상품이 자료에 없다',
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문 수량보다 재고가 적은 상품이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('재고가 모자란 상품 이름 — 재고가 주문 수량보다 적은 상품'),
    수량: z.number().describe('주문 수량 — 상품 재고보다 많은 수'),
    재고부족문구: z.string().describe('재고 부족 토스트 문구 — 재고가 모자랄 때 뜨는 글'),
    받는분: z.string().describe('받는 분 — 공백이 아닌 글').default('김데모'),
    연락처: z.string().describe('연락처 — 숫자 10자나 11자').default('01012345678'),
    검색어: z.string().describe('주소 검색어 — 결과가 1건 이상인 2자 이상의 도로명이나 지역').default('테헤란로'),
    상세주소: z.string().describe('상세 주소 — 공백이 아닌 글').default('1층'),
    결제수단: z.enum(['신용카드', '계좌이체', '무통장입금']).describe('결제 수단 — 세 가지 중 하나').default('신용카드'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);
  const 상세 = new 주문상세화면(driver);

  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
  });

  await test.step('재고가 모자란 상품을 확인한다', async () => {
    const 상품 = await 상품상세열기(driver, params.상품이름);
    await verify('주문 수량보다 재고가 적은 상품이 있다', await 상품.바로구매보이나(), true, { blocker: true });
  });

  await test.step('그 상품을 주문하고 「결제하기」를 누른다', async () => {
    const 상품 = new 상품상세화면(driver);
    await 상품.옵션다고르기();
    await 수량맞추기(상품, params.수량);
    await 상품.바로구매();
    await 주문하기.열릴때까지();
    await 주문하기.다채우기(
      주문서({
        받는분: params.받는분,
        연락처: params.연락처,
        검색어: params.검색어,
        상세주소: params.상세주소,
        결제수단: params.결제수단,
      }),
      await 기기오늘(driver),
    );
    const 글 = await 결제누르고토스트글(driver, 주문하기);
    const 문구 = await verify('재고 부족 문구가 토스트로 보인다', 글, params.재고부족문구);
    const 주문안함 = await verify('주문 상세로 넘어가지 않는다', await 상세.보이나(), false);
    await verify('재고가 모자라면 주문하지 않고 재고 부족 문구가 토스트로 보인다', 문구 && 주문안함, true);
  }, { capture: true });
});

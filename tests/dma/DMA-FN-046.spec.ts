import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기오늘 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 바로구매열기 } from './helpers/order.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-046',
  name: '결제한 뒤 주문 상세의 결제 금액은 주문하기에서 본 최종 결제 금액과 같다',
  platforms: ['android'],
  precondition: ['주문하기 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    productName: z.string().describe('주문할 상품 — 품절이 아닌 상품').default('USB-C 허브'),
    receiver: z.string().describe('받는 분 — 이름 글자').default('김데모'),
    phone: z.string().describe('연락처 — 숫자 10~11자').default('01012345678'),
    addressKeyword: z.string().describe('주소 검색어 — 결과가 나오는 도로명').default('테헤란로'),
    addressDetail: z.string().describe('상세 주소 — 짧은 글자').default('1층'),
    payMethod: z.enum(['신용카드', '계좌이체', '무통장입금']).describe('결제 수단').default('신용카드'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 주문하기 = new 주문하기화면(driver);
  const 상세 = new 주문상세화면(driver);

  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('주문하기 화면을 연다', async () => {
    await 바로구매열기(driver, params.productName);
    await verify('주문하기 화면이 보인다', await 주문하기.보이나(), true, { blocker: true });
  });

  await test.step('주문서를 채운다', async () => {
    await 주문하기.다채우기(
      {
        받는분: params.receiver,
        연락처: params.phone,
        검색어: params.addressKeyword,
        상세주소: params.addressDetail,
        결제수단: params.payMethod,
      },
      await 기기오늘(driver),
    );
  });

  await test.step('최종 결제 금액을 읽고 결제한다', async () => {
    const 최종금액 = await 주문하기.최종결제금액값();
    await 주문하기.결제누르기();
    await 상세.열릴때까지();
    await verify('결제한 뒤 주문 상세의 결제 금액은 주문하기에서 본 최종 결제 금액과 같다', await 상세.결제금액값(), 최종금액);
  }, { capture: true });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기오늘 } from './helpers/app.helper.js';
import { 로그인하고주문하기열기, 주문서 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-405',
  name: '신용카드로 결제하면 일시불로 결제된다',
  platforms: ['android'],
  held: '판정 불가 — 일시불이 드러나는 화면 자리가 기획서에 없다',
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문하기 화면을 다 채웠다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
    받는분: z.string().describe('받는 분 — 공백이 아닌 글').default('김데모'),
    연락처: z.string().describe('연락처 — 숫자 10자나 11자').default('01012345678'),
    검색어: z.string().describe('주소 검색어 — 결과가 1건 이상인 2자 이상의 도로명이나 지역').default('테헤란로'),
    상세주소: z.string().describe('상세 주소 — 공백이 아닌 글').default('1층'),
    일시불글: z.string().describe('일시불로 보이는 글 — 신용카드로 결제한 뒤 주문 상세에 보이는 일시불 표시'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);
  const 상세 = new 주문상세화면(driver);

  await test.step('일반 회원 계정으로 로그인해 주문하기 화면을 다 채운다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
    await 주문하기.다채우기(
      주문서({
        받는분: params.받는분,
        연락처: params.연락처,
        검색어: params.검색어,
        상세주소: params.상세주소,
        결제수단: '신용카드',
      }),
      await 기기오늘(driver),
    );
  });

  await test.step('주문하기 화면을 확인한다', async () => {
    await verify('주문하기 화면을 다 채웠다', await 주문하기.동의했나(), true, { blocker: true });
  });

  await test.step('「신용카드」로 결제한다', async () => {
    await 주문하기.결제수단고르기('신용카드');
    await 주문하기.결제누르기();
    await 상세.열릴때까지();
    await verify(
      '신용카드로 결제하면 일시불로 결제된다',
      (await 상세.화면글들()).some((글) => 글.includes(params.일시불글)),
      true,
    );
  }, { capture: true });
});

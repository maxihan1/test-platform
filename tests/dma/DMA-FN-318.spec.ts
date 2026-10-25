import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기오늘 } from './helpers/app.helper.js';
import { 결제누르고토스트글, 로그인하고주문하기열기, 주문서 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-318',
  name: '결제 수단이 비어 있으면 주문하지 않고 토스트 「결제 수단을 선택하세요」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문하기 화면을 결제 수단만 빼고 채웠다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
    받는분: z.string().describe('받는 분 — 공백이 아닌 글').default('김데모'),
    연락처: z.string().describe('연락처 — 숫자 10자나 11자').default('01012345678'),
    검색어: z.string().describe('주소 검색어 — 결과가 1건 이상인 2자 이상의 도로명이나 지역').default('테헤란로'),
    상세주소: z.string().describe('상세 주소 — 공백이 아닌 글').default('1층'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);
  const 상세 = new 주문상세화면(driver);

  await test.step('일반 회원 계정으로 로그인해 결제 수단만 빼고 주문하기 화면을 채운다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
    await 주문하기.다채우기(
      주문서({
        받는분: params.받는분,
        연락처: params.연락처,
        검색어: params.검색어,
        상세주소: params.상세주소,
      }),
      await 기기오늘(driver),
      '결제 수단',
    );
  });

  await test.step('주문하기 화면을 확인한다', async () => {
    await verify('주문하기 화면을 결제 수단만 빼고 채웠다', await 주문하기.동의했나(), true, { blocker: true });
  });

  await test.step('「결제하기」를 누른다', async () => {
    const 글 = await 결제누르고토스트글(driver, 주문하기);
    const 토스트판정 = await verify('토스트 「결제 수단을 선택하세요」가 보인다', 글, '결제 수단을 선택하세요');
    const 주문안함 = await verify('주문 상세로 넘어가지 않는다', await 상세.보이나(), false);
    await verify('결제 수단이 비어 있으면 주문하지 않고 토스트 「결제 수단을 선택하세요」가 보인다', 토스트판정 && 주문안함, true);
  }, { capture: true });
});

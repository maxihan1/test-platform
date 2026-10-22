import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품읽기 } from './helpers/api.helper.js';
import { 기본결제수단, 바로구매로열기, 서버정리하기, 서버준비하기, 칸채우기, type 정리거리 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-262',
  name: '결제 뒤 주문 상세에서 뒤로 가면 상품 목록이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('주문할 상품 번호 — 품절이 아닌 상품').default(1),
    받는분: z.string().describe('받는 분 이름 — 공백이 아닌 글자').default('김데모'),
    연락처: z.string().describe('연락처 — 숫자 10~11자').default('01012345678'),
    상세주소: z.string().describe('상세 주소 — 공백이 아닌 글자').default('4층'),
    주소검색어: z.string().describe('주소 검색어 — 결과가 나오는 도로명이나 지역, 2자 이상').default('테헤란'),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 거리: 정리거리 = {};
  let 상품명 = '';

  try {
    await test.step('일반 회원으로 로그인한다', async () => {
      await 서버준비하기(request, params.loginId ?? '', params.loginPassword ?? '', 거리);
      상품명 = (await 상품읽기(request, params.상품번호)).name;
      const 열림 = await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
      await verify('상품 목록이 보인다', 열림, true, { blocker: true });
    });

    await test.step('상품 상세에서 「바로 구매」를 눌러 주문하기를 연다', async () => {
      const 열림 = await 바로구매로열기(driver, 상품명);
      await verify('주문하기 화면이 보인다', 열림, true, { blocker: true });
    });

    await test.step('주문하기에서 배송 정보를 채우고 결제한다', async () => {
      await 칸채우기(driver, {
        받는분: params.받는분,
        연락처: params.연락처,
        상세주소: params.상세주소,
        주소검색어: params.주소검색어,
        날짜: true,
        결제수단: 기본결제수단,
        동의: true,
      });
      await new 주문하기화면(driver).결제누르기();
      await verify('주문 상세 화면이 보인다', await new 주문상세화면(driver).열릴때까지(), true, { blocker: true });
    });

    await test.step('결제 뒤 주문 상세에서 기기의 뒤로 가기를 누른다', async () => {
      await driver.back();
      await verify('결제 뒤 주문 상세에서 뒤로 가면 상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true);
    });
  } finally {
    await 서버정리하기(request, 거리);
  }
});

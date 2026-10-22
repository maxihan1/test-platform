import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품읽기 } from './helpers/api.helper.js';
import {
  기본결제수단,
  서버정리하기,
  서버준비하기,
  장바구니에서주문하기열기,
  장바구니열기,
  줄만체크하기,
  칸채우기,
  type 정리거리,
} from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-265',
  name: '장바구니에서 주문하면 주문한 줄이 장바구니에서 빠진다',
  platforms: ['android'],
  precondition: ['장바구니에 상품 두 줄이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주문할상품번호: z.number().describe('체크해 주문할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
    남길상품번호: z.number().describe('장바구니에 남길 상품 번호 — 옵션이 없고 품절이 아닌 다른 상품').default(20),
    받는분: z.string().describe('받는 분 이름 — 공백이 아닌 글자').default('김데모'),
    연락처: z.string().describe('연락처 — 숫자 10~11자').default('01012345678'),
    상세주소: z.string().describe('상세 주소 — 공백이 아닌 글자').default('4층'),
    주소검색어: z.string().describe('주소 검색어 — 결과가 나오는 도로명이나 지역, 2자 이상').default('테헤란'),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 거리: 정리거리 = {};
  let 주문할이름 = '';
  let 남길이름 = '';

  try {
    await test.step('일반 회원으로 로그인한다', async () => {
      await 서버준비하기(request, params.loginId ?? '', params.loginPassword ?? '', 거리, [
        { productId: params.주문할상품번호 },
        { productId: params.남길상품번호 },
      ]);
      주문할이름 = (await 상품읽기(request, params.주문할상품번호)).name;
      남길이름 = (await 상품읽기(request, params.남길상품번호)).name;
      const 열림 = await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
      await verify('상품 목록이 보인다', 열림, true, { blocker: true });
    });

    await test.step('상품 목록에서 장바구니를 연다', async () => {
      await verify('장바구니 화면이 보인다', await 장바구니열기(driver), true, { blocker: true });
      await verify('장바구니에 상품 두 줄이 보인다', await new 장바구니화면(driver).줄수(), 2, { blocker: true });
    });

    await test.step('한 줄만 체크해 주문하고 장바구니를 다시 연다', async () => {
      await 줄만체크하기(driver, [주문할이름, 남길이름], 주문할이름);
      await verify('주문하기 화면이 보인다', await 장바구니에서주문하기열기(driver), true, { blocker: true });
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
      await driver.back();
      await new 상품목록화면(driver).열릴때까지();
      await verify('장바구니 화면이 다시 보인다', await 장바구니열기(driver), true, { blocker: true });
      await verify('장바구니에서 주문하면 주문한 줄이 장바구니에서 빠진다', (await new 장바구니화면(driver).줄이름들()).join(', '), 남길이름);
    });
  } finally {
    await 서버정리하기(request, 거리);
  }
});

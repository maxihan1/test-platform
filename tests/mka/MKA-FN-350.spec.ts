import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품읽기, 주문만들기 } from './helpers/api.helper.js';
import {
  기본결제수단,
  결제눌러토스트읽기,
  서버정리하기,
  서버준비하기,
  장바구니에서주문하기열기,
  장바구니열기,
  칸채우기,
  type 정리거리,
} from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-350',
  name: '재고가 모자라면 재고 부족 문구가 토스트로 보인다',
  platforms: ['android'],
  held: '판정 불가 — 재고 부족 문구가 이번 자료에 없다(REQ-ORD-010)',
  precondition: ['주문할 상품의 재고가 모자란다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('재고가 1개인 상품 번호 — 옵션이 없는 상품').default(12),
    재고부족문구: z.string().describe('재고가 모자랄 때 토스트 문구'),
    받는분: z.string().describe('받는 분 이름 — 공백이 아닌 글자').default('김데모'),
    연락처: z.string().describe('연락처 — 숫자 10~11자').default('01012345678'),
    상세주소: z.string().describe('상세 주소 — 공백이 아닌 글자').default('4층'),
    주소검색어: z.string().describe('주소 검색어 — 결과가 나오는 도로명이나 지역, 2자 이상').default('테헤란'),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 거리: 정리거리 = {};

  try {
    await test.step('일반 회원으로 로그인한다', async () => {
      await 서버준비하기(request, params.loginId ?? '', params.loginPassword ?? '', 거리, [{ productId: params.상품번호 }]);
      const 열림 = await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
      await verify('상품 목록이 보인다', 열림, true, { blocker: true });
    });

    await test.step('상품 목록에서 장바구니를 연다', async () => {
      await verify('장바구니 화면이 보인다', await 장바구니열기(driver), true, { blocker: true });
      await verify('장바구니에 상품 한 줄이 보인다', await new 장바구니화면(driver).줄수(), 1, { blocker: true });
    });

    await test.step('같은 상품을 서버에서 먼저 사 재고를 비운다', async () => {
      await 주문만들기(request, { productId: params.상품번호 });
      await verify('상품 재고가 0이다', (await 상품읽기(request, params.상품번호)).stock, 0, { blocker: true });
    });

    await test.step('재고보다 많은 수량으로 결제한다', async () => {
      const 열림 = await 장바구니에서주문하기열기(driver);
      await verify('주문하기 화면이 보인다', 열림, true, { blocker: true });
      await 칸채우기(driver, {
        받는분: params.받는분,
        연락처: params.연락처,
        상세주소: params.상세주소,
        주소검색어: params.주소검색어,
        날짜: true,
        결제수단: 기본결제수단,
        동의: true,
      });
      await verify('재고가 모자라면 재고 부족 문구가 토스트로 보인다', await 결제눌러토스트읽기(driver), params.재고부족문구);
    });
  } finally {
    await 서버정리하기(request, 거리);
  }
});

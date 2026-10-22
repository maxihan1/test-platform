import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품읽기 } from './helpers/api.helper.js';
import {
  기본결제수단,
  결제눌러토스트읽기,
  바로구매로열기,
  서버정리하기,
  서버준비하기,
  주문하기다시열기,
  칸채우기,
  type 정리거리,
} from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-270',
  name: '모든 칸을 비우고 결제하면 첫 문구 「받는 분을 입력하세요」만 토스트로 보인다',
  platforms: ['android'],
  techniques: ['동등 분할', '결정 테이블'],
  precondition: ['일반 회원으로 로그인해 있다', '주문하기의 다른 칸은 바르게 채웠다'],
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

  const 다시열기 = async (): Promise<void> => {
    if (!(await 주문하기다시열기(driver, 상품명))) throw new Error('주문하기 화면을 다시 열지 못했다');
  };

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

    await test.step('주문하기의 모든 칸을 비운 채 결제한다', async () => {
      await new 주문하기화면(driver).동의누르기();
      await verify('모든 칸을 비우고 결제하면 첫 문구 「받는 분을 입력하세요」만 토스트로 보인다', await 결제눌러토스트읽기(driver), '받는 분을 입력하세요');
    });

    await test.step('주소를 검색하지 않고 결제한다', async () => {
      await 칸채우기(driver, {
        받는분: params.받는분,
        연락처: params.연락처,
        상세주소: params.상세주소,
        날짜: true,
        결제수단: 기본결제수단,
      });
      await verify('주소를 검색하지 않고 결제하면 토스트 「주소를 검색하세요」가 보인다', await 결제눌러토스트읽기(driver), '주소를 검색하세요');
    });

    await test.step('배송 희망일을 고르지 않고 결제한다', async () => {
      await 다시열기();
      await 칸채우기(driver, {
        받는분: params.받는분,
        연락처: params.연락처,
        상세주소: params.상세주소,
        주소검색어: params.주소검색어,
        결제수단: 기본결제수단,
        동의: true,
      });
      await verify('배송 희망일을 고르지 않고 결제하면 토스트 「배송 희망일을 선택하세요」가 보인다', await 결제눌러토스트읽기(driver), '배송 희망일을 선택하세요');
    });

    await test.step('결제 수단을 고르지 않고 결제한다', async () => {
      await 다시열기();
      await 칸채우기(driver, {
        받는분: params.받는분,
        연락처: params.연락처,
        상세주소: params.상세주소,
        주소검색어: params.주소검색어,
        날짜: true,
        동의: true,
      });
      await verify('결제 수단을 고르지 않고 결제하면 토스트 「결제 수단을 선택하세요」가 보인다', await 결제눌러토스트읽기(driver), '결제 수단을 선택하세요');
      await verify('빠진 값이 있어 막히면 주문 상세로 가지 않는다', await new 주문상세화면(driver).보이는가(), false);
    });

    await test.step('「연락처」만 비우고 결제한다', async () => {
      const 화면 = new 주문하기화면(driver);
      await 화면.결제수단고르기(기본결제수단);
      await 화면.칸적기('phone', '');
      await verify('「연락처」만 비우고 결제하면 토스트 「연락처는 숫자 10~11자입니다」가 보인다', await 결제눌러토스트읽기(driver), '연락처는 숫자 10~11자입니다');
    });

    await test.step('「상세 주소」만 비우고 결제한다', async () => {
      const 화면 = new 주문하기화면(driver);
      await 화면.칸적기('phone', params.연락처);
      await 화면.칸적기('address_detail', '');
      await verify('「상세 주소」만 비우고 결제하면 토스트 「상세 주소를 입력하세요」가 보인다', await 결제눌러토스트읽기(driver), '상세 주소를 입력하세요');
    });
  } finally {
    await 서버정리하기(request, 거리);
  }
});

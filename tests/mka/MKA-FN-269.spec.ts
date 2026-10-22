import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품읽기 } from './helpers/api.helper.js';
import { 기본결제수단, 결제눌러토스트읽기, 바로구매로열기, 서버정리하기, 서버준비하기, 칸채우기, type 정리거리 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-269',
  name: '「연락처」를 9자로 적고 결제하면 토스트 「연락처는 숫자 10~11자입니다」가 보인다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['주문하기의 다른 칸은 바르게 채웠다', '결제 수단만 고르지 않았다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('주문할 상품 번호 — 품절이 아닌 상품').default(1),
    받는분: z.string().describe('받는 분 이름 — 공백이 아닌 글자').default('김데모'),
    상세주소: z.string().describe('상세 주소 — 공백이 아닌 글자').default('4층'),
    주소검색어: z.string().describe('주소 검색어 — 결과가 나오는 도로명이나 지역, 2자 이상').default('테헤란'),
    연락처9자: z.string().describe('9자 연락처 — 숫자 9자').default('010123456'),
    연락처10자: z.string().describe('10자 연락처 — 숫자 10자').default('0101234567'),
    연락처11자: z.string().describe('11자 연락처 — 숫자 11자').default('01012345678'),
    연락처12자: z.string().describe('12자 연락처 — 숫자 12자').default('010123456789'),
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

    await test.step('연락처와 결제 수단 말고 주문하기의 다른 칸을 바르게 채운다', async () => {
      await 칸채우기(driver, {
        받는분: params.받는분,
        상세주소: params.상세주소,
        주소검색어: params.주소검색어,
        날짜: true,
        동의: true,
      });
      await verify('주소 줄에 검색한 주소가 들어 있다', (await new 주문하기화면(driver).주소글()) !== '주소를 검색하세요', true, { blocker: true });
    });

    await test.step('「연락처」를 10자로 적고 결제한다', async () => {
      await new 주문하기화면(driver).칸적기('phone', params.연락처10자);
      await verify('「연락처」를 10자로 적으면 연락처 문구 없이 다음 문구 「결제 수단을 선택하세요」가 보인다', await 결제눌러토스트읽기(driver), '결제 수단을 선택하세요');
    });

    await test.step('「연락처」를 11자로 적고 결제한다', async () => {
      await new 주문하기화면(driver).칸적기('phone', params.연락처11자);
      await verify('「연락처」를 11자로 적으면 연락처 문구 없이 다음 문구 「결제 수단을 선택하세요」가 보인다', await 결제눌러토스트읽기(driver), '결제 수단을 선택하세요');
    });

    await test.step('「연락처」를 9자로 적고 결제한다', async () => {
      const 화면 = new 주문하기화면(driver);
      await 화면.결제수단고르기(기본결제수단);
      await 화면.칸적기('phone', params.연락처9자);
      await verify('「연락처」를 9자로 적고 결제하면 토스트 「연락처는 숫자 10~11자입니다」가 보인다', await 결제눌러토스트읽기(driver), '연락처는 숫자 10~11자입니다');
    });

    await test.step('「연락처」를 12자로 적고 결제한다', async () => {
      await new 주문하기화면(driver).칸적기('phone', params.연락처12자);
      await verify('「연락처」를 12자로 적고 결제하면 토스트 「연락처는 숫자 10~11자입니다」가 보인다', await 결제눌러토스트읽기(driver), '연락처는 숫자 10~11자입니다');
    });
  } finally {
    await 서버정리하기(request, 거리);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품읽기, 주문읽기 } from './helpers/api.helper.js';
import { 바로구매로열기, 새주문번호들, 서버정리하기, 서버준비하기, 칸채우기, type 정리거리 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-241',
  name: '「신용카드」로 결제하면 서버 주문의 할부가 「일시불」이다',
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

    await test.step('결제 수단 말고 주문하기의 다른 칸을 바르게 채운다', async () => {
      await 칸채우기(driver, {
        받는분: params.받는분,
        연락처: params.연락처,
        상세주소: params.상세주소,
        주소검색어: params.주소검색어,
        날짜: true,
        동의: true,
      });
      await verify('주소 줄에 검색한 주소가 들어 있다', (await new 주문하기화면(driver).주소글()) !== '주소를 검색하세요', true, { blocker: true });
    });

    await test.step('「신용카드」로 결제한다', async () => {
      const 화면 = new 주문하기화면(driver);
      await 화면.결제수단고르기('신용카드');
      await 화면.결제누르기();
      await verify('주문 상세 화면이 보인다', await new 주문상세화면(driver).열릴때까지(), true, { blocker: true });
      const 새주문 = await 새주문번호들(request, 거리.앞주문번호들 ?? []);
      await verify('서버에 새 주문이 하나 생긴다', 새주문.length, 1, { blocker: true });
      await verify('「신용카드」로 결제하면 서버 주문의 할부가 「일시불」이다', (await 주문읽기(request, 새주문[0])).payment.installment, '일시불');
    });
  } finally {
    await 서버정리하기(request, 거리);
  }
});

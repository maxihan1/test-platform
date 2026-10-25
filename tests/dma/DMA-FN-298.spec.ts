import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기오늘 } from './helpers/app.helper.js';
import { 목록으로돌아가기, 상품담기, 장바구니열기, 장바구니줄지우기 } from './helpers/cart.helper.js';
import { 장바구니줄뜰때까지, 주문서 } from './helpers/checkout-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-298',
  name: '장바구니에서 주문하면 주문한 줄이 장바구니에서 빠진다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '담을 상품이 장바구니에 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('장바구니에 담아 주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
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

  await test.step('일반 회원 계정으로 로그인해 지난 실행이 남긴 장바구니 줄을 지운다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await 장바구니줄지우기(driver, params.상품이름);
  });

  await test.step('장바구니를 확인한다', async () => {
    const 장바구니 = await 장바구니열기(driver);
    await 장바구니줄뜰때까지(driver, 장바구니);
    await verify('담을 상품이 장바구니에 없다', !(await 장바구니.줄이름들()).includes(params.상품이름), true, { blocker: true });
    await 목록으로돌아가기(driver);
  });

  try {
    await test.step('상품을 담고 그 줄만 체크해 주문한 뒤 장바구니를 연다', async () => {
      await 상품담기(driver, params.상품이름);
      const 장바구니 = await 장바구니열기(driver);
      await 장바구니.한줄만체크(params.상품이름);
      await 장바구니.주문하기누르기();
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
      await 주문하기.결제누르기();
      await 상세.열릴때까지();
      await 목록으로돌아가기(driver);
      const 주문후 = await 장바구니열기(driver);
      await 장바구니줄뜰때까지(driver, 주문후);
      await verify(
        '장바구니에서 주문하면 주문한 줄이 장바구니에서 빠진다',
        !(await 주문후.줄이름들()).includes(params.상품이름),
        true,
      );
    }, { capture: true });
  } finally {
    await test.step('담았던 상품 줄이 남았으면 지운다', async () => {
      await 목록으로돌아가기(driver);
      await 장바구니줄지우기(driver, params.상품이름);
    });
  }
});

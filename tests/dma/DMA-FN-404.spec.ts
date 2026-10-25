import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기오늘 } from './helpers/app.helper.js';
import { 목록으로돌아가기 } from './helpers/cart.helper.js';
import { 앞번호앞의주문수, 주문서 } from './helpers/checkout-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 바로구매열기, 주문내역열기 } from './helpers/order.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-404',
  name: '「결제하기」를 빠르게 두 번 눌러도 주문 내역에 새 주문이 하나만 생긴다',
  platforms: ['android'],
  techniques: ['오류 추정'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문하기 화면을 다 채웠다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
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
  let 앞번호 = '';

  await test.step('일반 회원 계정으로 로그인해 주문 내역의 첫 주문 번호를 읽어 둔다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    const 내역 = await 주문내역열기(driver);
    const 첫카드 = (await 내역.카드들())[0];
    if (첫카드 === undefined) throw new Error('주문 내역에 주문이 없다');
    앞번호 = await 내역.카드주문번호(첫카드);
  });

  await test.step('주문하기 화면을 다 채운다', async () => {
    await 목록으로돌아가기(driver);
    await 바로구매열기(driver, params.상품이름);
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
  });

  await test.step('주문하기 화면을 확인한다', async () => {
    await verify('주문하기 화면을 다 채웠다', await 주문하기.동의했나(), true, { blocker: true });
  });

  await test.step('「결제하기」를 빠르게 두 번 누른다', async () => {
    await 주문하기.결제두번누르기();
    await 상세.열릴때까지();
    const 내역 = await 주문내역열기(driver);
    await verify(
      '「결제하기」를 빠르게 두 번 눌러도 주문 내역에 새 주문이 하나만 생긴다',
      await 앞번호앞의주문수(내역, 앞번호),
      1,
    );
  }, { capture: true });
});

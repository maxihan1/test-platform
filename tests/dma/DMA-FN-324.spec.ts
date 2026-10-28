import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기오늘, 일요일아닌첫날 } from './helpers/app.helper.js';
import { 눌러서바뀐토스트글, 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 토스트비우기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-324',
  name: '오류 토스트는 한 번에 하나씩 받는 분 · 연락처 · 주소 · 상세 주소 · 배송 희망일 · 결제 수단 차례로 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문하기 화면이 비어 있다'],
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

  await test.step('일반 회원 계정으로 로그인해 빈 주문하기 화면을 연다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
  });

  await test.step('주문하기 화면을 확인한다', async () => {
    await verify('주문하기 화면이 비어 있다', await 주문하기.주소줄글(), '주소를 검색하세요', { blocker: true });
  });

  await test.step('빈 칸을 하나씩 채우며 「결제하기」를 누른다', async () => {
    await 주문하기.동의하기();
    await 토스트비우기(driver);
    const 받는분글 = await 눌러서바뀐토스트글(driver, 주문하기, '');
    await 주문하기.받는분적기(params.받는분);
    const 연락처글 = await 눌러서바뀐토스트글(driver, 주문하기, 받는분글);
    await 주문하기.연락처적기(params.연락처);
    const 주소글 = await 눌러서바뀐토스트글(driver, 주문하기, 연락처글);
    await 주문하기.주소넣기(params.검색어);
    const 상세주소글 = await 눌러서바뀐토스트글(driver, 주문하기, 주소글);
    await 주문하기.상세주소적기(params.상세주소);
    const 배송일글 = await 눌러서바뀐토스트글(driver, 주문하기, 상세주소글);
    await 주문하기.날짜고르기(일요일아닌첫날(await 기기오늘(driver)));
    const 결제수단글 = await 눌러서바뀐토스트글(driver, 주문하기, 배송일글);
    await verify(
      '오류 토스트는 한 번에 하나씩 받는 분 · 연락처 · 주소 · 상세 주소 · 배송 희망일 · 결제 수단 차례로 보인다',
      [받는분글, 연락처글, 주소글, 상세주소글, 배송일글, 결제수단글].join(', '),
      [
        '받는 분을 입력하세요',
        '연락처는 숫자 10~11자입니다',
        '주소를 검색하세요',
        '상세 주소를 입력하세요',
        '배송 희망일을 선택하세요',
        '결제 수단을 선택하세요',
      ].join(', '),
    );
  }, { capture: true });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기오늘 } from './helpers/app.helper.js';
import { 결제누르고토스트글, 로그인하고주문하기열기, 주문서 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-305',
  name: '연락처가 숫자 10~11자가 아니면 토스트가 보이고 10~11자면 다음 오류로 넘어간다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문하기 화면을 결제 수단만 빼고 채웠다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
    받는분: z.string().describe('받는 분 — 공백이 아닌 글').default('김데모'),
    검색어: z.string().describe('주소 검색어 — 결과가 1건 이상인 2자 이상의 도로명이나 지역').default('테헤란로'),
    상세주소: z.string().describe('상세 주소 — 공백이 아닌 글').default('1층'),
    연락처9자: z.string().describe('9자 연락처 — 숫자 9자').default('010123456'),
    연락처10자: z.string().describe('10자 연락처 — 숫자 10자').default('0101234567'),
    연락처11자: z.string().describe('11자 연락처 — 숫자 11자').default('01012345678'),
    연락처12자: z.string().describe('12자 연락처 — 숫자 12자').default('010123456789'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);

  await test.step('일반 회원 계정으로 로그인해 결제 수단만 빼고 주문하기 화면을 채운다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
    await 주문하기.다채우기(
      주문서({
        받는분: params.받는분,
        연락처: params.연락처11자,
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

  await test.step('연락처를 9자 「010123456」로 적고 「결제하기」를 누른다', async () => {
    await 주문하기.연락처적기(params.연락처9자);
    await verify(
      '연락처가 9자면 토스트 「연락처는 숫자 10~11자입니다」가 보인다',
      await 결제누르고토스트글(driver, 주문하기),
      '연락처는 숫자 10~11자입니다',
    );
  });

  await test.step('연락처를 10자 「0101234567」로 적고 「결제하기」를 누른다', async () => {
    await 주문하기.연락처적기(params.연락처10자);
    await verify(
      '연락처가 10자면 연락처를 넘어가 다음 오류 「결제 수단을 선택하세요」가 보인다',
      await 결제누르고토스트글(driver, 주문하기),
      '결제 수단을 선택하세요',
    );
  });

  await test.step('연락처를 11자 「01012345678」로 적고 「결제하기」를 누른다', async () => {
    await 주문하기.연락처적기(params.연락처11자);
    await verify(
      '연락처가 11자여도 연락처를 넘어가 다음 오류 「결제 수단을 선택하세요」가 보인다',
      await 결제누르고토스트글(driver, 주문하기),
      '결제 수단을 선택하세요',
    );
  });

  await test.step('연락처를 12자 「010123456789」로 적고 「결제하기」를 누른다', async () => {
    await 주문하기.연락처적기(params.연락처12자);
    await verify(
      '연락처가 12자면 토스트 「연락처는 숫자 10~11자입니다」가 다시 보인다',
      await 결제누르고토스트글(driver, 주문하기),
      '연락처는 숫자 10~11자입니다',
    );
  }, { capture: true });
});

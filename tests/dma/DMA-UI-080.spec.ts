import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기, 보이게하기, 보이는칸이름 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-080',
  name: '「배송 정보」에 「받는 분」 · 「연락처 (숫자만)」 · 주소 줄 · 「상세 주소」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문하기 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);

  await test.step('일반 회원 계정으로 로그인해 주문하기 화면을 연다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
  });

  await test.step('주문하기 화면을 확인한다', async () => {
    await verify('주문하기 화면이 떠 있다', await 주문하기.보이나(), true, { blocker: true });
  });

  await test.step('「배송 정보」를 확인한다', async () => {
    const 받는분 = await verify('「받는 분」이 보인다', await 보이는칸이름(주문하기, await 주문하기.받는분.getElement()), '받는 분');
    const 연락처 = await verify(
      '「연락처 (숫자만)」가 보인다',
      await 보이는칸이름(주문하기, await 주문하기.연락처.getElement()),
      '연락처 (숫자만)',
    );
    await 보이게하기(주문하기, await 주문하기.주소줄.getElement());
    const 주소줄 = await verify('주소 줄이 보인다', await 주문하기.주소줄.isDisplayed(), true);
    const 상세주소 = await verify(
      '「상세 주소」가 보인다',
      await 보이는칸이름(주문하기, await 주문하기.상세주소.getElement()),
      '상세 주소',
    );
    await verify(
      '「배송 정보」에 「받는 분」 · 「연락처 (숫자만)」 · 주소 줄 · 「상세 주소」가 보인다',
      받는분 && 연락처 && 주소줄 && 상세주소,
      true,
    );
  }, { capture: true });
});

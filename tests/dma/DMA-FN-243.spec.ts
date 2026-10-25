import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-243',
  name: '연락처 칸에 숫자가 아닌 글자를 섞어 적으면 숫자만 들어간다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문하기 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
    연락처: z.string().describe('연락처 칸에 적을 글 — 숫자가 아닌 글자가 하나 이상 섞인 글').default('010-1234-abcd'),
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

  await test.step('연락처 칸에 「010-1234-abcd」를 적는다', async () => {
    await 주문하기.연락처적기(params.연락처);
    await verify(
      '연락처 칸에 숫자가 아닌 글자를 섞어 적으면 숫자만 들어간다',
      await 주문하기.연락처글(),
      params.연락처.replace(/\D/g, ''),
    );
  }, { capture: true });
});

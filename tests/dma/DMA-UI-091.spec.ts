import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기, 보이는결제수단글 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-091',
  name: '「결제 수단」에 「신용카드」 · 「계좌이체」 · 「무통장입금」 라디오가 보인다',
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

  await test.step('「결제 수단」을 확인한다', async () => {
    const 카드 = await verify('「신용카드」 라디오가 보인다', await 보이는결제수단글(주문하기, '신용카드'), '신용카드');
    const 계좌 = await verify('「계좌이체」 라디오가 보인다', await 보이는결제수단글(주문하기, '계좌이체'), '계좌이체');
    const 무통장 = await verify('「무통장입금」 라디오가 보인다', await 보이는결제수단글(주문하기, '무통장입금'), '무통장입금');
    await verify('「결제 수단」에 「신용카드」 · 「계좌이체」 · 「무통장입금」 라디오가 보인다', 카드 && 계좌 && 무통장, true);
  }, { capture: true });
});

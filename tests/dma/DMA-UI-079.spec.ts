import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기, 주문상품줄꼴인가 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-079',
  name: '옵션 없는 상품의 주문 상품 줄은 괄호 없이 「{상품명} × {수량} {금액}」으로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '옵션 없는 상품을 바로 구매했다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);

  await test.step('일반 회원 계정으로 로그인해 옵션 없는 상품을 바로 구매한다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
  });

  await test.step('주문하기 화면을 확인한다', async () => {
    await verify('옵션 없는 상품을 바로 구매했다', await 주문하기.보이나(), true, { blocker: true });
  });

  await test.step('「주문 상품」 줄을 확인한다', async () => {
    await verify(
      '옵션 없는 상품의 주문 상품 줄은 괄호 없이 「{상품명} × {수량} {금액}」으로 보인다',
      주문상품줄꼴인가(await 주문하기.주문상품줄글들(), params.상품이름, 1, false),
      true,
    );
  }, { capture: true });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기, 최종결제금액이바뀔때까지 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-286',
  name: '쿠폰을 고르면 쿠폰 할인과 최종 결제 금액이 바로 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문하기 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z
      .string()
      .describe('주문할 상품 이름 — 옵션이 없고 품절이 아니며 고를 수 있는 쿠폰이 있는 금액의 상품')
      .default('USB-C 허브'),
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

  await test.step('고를 수 있는 쿠폰을 누른다', async () => {
    const 앞할인글 = await 주문하기.쿠폰할인글();
    const 앞최종 = await 주문하기.최종결제금액값();
    await 주문하기.고를수있는쿠폰누르기();
    await 주문하기.쿠폰할인이바뀔때까지(앞할인글).catch(() => undefined);
    await verify('쿠폰을 고르면 쿠폰 할인이 0원이 아닌 값으로 바로 바뀐다', (await 주문하기.쿠폰할인값()) !== 0, true);
    await 최종결제금액이바뀔때까지(주문하기, 앞최종, driver).catch(() => undefined);
    await verify(
      '쿠폰을 고르면 최종 결제 금액이 상품 금액 − 쿠폰 할인 + 배송비로 바로 바뀐다',
      await 주문하기.최종결제금액값(),
      (await 주문하기.상품금액값()) - (await 주문하기.쿠폰할인값()) + (await 주문하기.배송비값()),
    );
  }, { capture: true });
});

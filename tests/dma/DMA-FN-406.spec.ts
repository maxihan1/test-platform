import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기, 보이게하기 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-406',
  name: '최소 주문 금액에 못 미치는 쿠폰은 흐리게 보이고 눌러도 쿠폰 할인이 「쿠폰 할인 -0원」 그대로다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  held: '보류 — 쿠폰의 최소 주문 금액이 기획서에 없다',
  precondition: ['일반 회원 계정으로 로그인해 있다', '최소 주문 금액에 못 미치는 쿠폰이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
    쿠폰칸이름: z.string().describe('최소 주문 금액에 못 미치는 쿠폰 칸 이름 — 주문 금액이 최소 주문 금액보다 적은 쿠폰의 칸 이름'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);

  await test.step('일반 회원 계정으로 로그인해 주문하기 화면을 연다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
  });

  await test.step('최소 주문 금액에 못 미치는 쿠폰을 확인한다', async () => {
    await 주문하기.쿠폰칸보이게();
    await 보이게하기(주문하기, await 주문하기.쿠폰(params.쿠폰칸이름).getElement());
    await verify('최소 주문 금액에 못 미치는 쿠폰이 있다', await 주문하기.쿠폰(params.쿠폰칸이름).isDisplayed(), true, { blocker: true });
  });

  await test.step('그 쿠폰을 누른다', async () => {
    const 쿠폰 = 주문하기.쿠폰(params.쿠폰칸이름);
    const 앞글 = await 주문하기.쿠폰할인글();
    const 눌림 = await 쿠폰.isEnabled();
    await 보이게하기(주문하기, await 쿠폰.getElement());
    await 쿠폰.click();
    await 주문하기.쿠폰할인이바뀔때까지(앞글, 3000).catch(() => undefined);
    const 흐림 = await verify('최소 주문 금액에 못 미치는 쿠폰은 흐리게 보인다', 눌림, false);
    const 그대로 = await verify('쿠폰 할인이 「쿠폰 할인 -0원」 그대로다', await 주문하기.쿠폰할인글(), '쿠폰 할인 -0원');
    await verify(
      '최소 주문 금액에 못 미치는 쿠폰은 흐리게 보이고 눌러도 쿠폰 할인이 「쿠폰 할인 -0원」 그대로다',
      흐림 && 그대로,
      true,
    );
  }, { capture: true });
});

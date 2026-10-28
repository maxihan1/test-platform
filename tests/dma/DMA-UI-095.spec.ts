import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 금액줄차례, 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-095',
  name: '주문하기 금액은 「상품 금액」 · 「쿠폰 할인 -{금액}」 · 「배송비」 · 「최종 결제 금액」 차례로 보인다',
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

  await test.step('금액 줄을 확인한다', async () => {
    const 꼴 = await verify('「쿠폰 할인 -{금액}」 꼴로 보인다', /^쿠폰 할인 -[\d,]+원$/.test(await 주문하기.쿠폰할인글()), true);
    const 차례 = await verify(
      '「상품 금액」 · 「쿠폰 할인」 · 「배송비」 · 「최종 결제 금액」 차례로 보인다',
      (await 금액줄차례(주문하기)).join(', '),
      '상품 금액, 쿠폰 할인, 배송비, 최종 결제 금액',
    );
    await verify('주문하기 금액은 「상품 금액」 · 「쿠폰 할인 -{금액}」 · 「배송비」 · 「최종 결제 금액」 차례로 보인다', 꼴 && 차례, true);
  }, { capture: true });
});

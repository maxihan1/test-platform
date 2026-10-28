import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-093',
  name: '「쿠폰」에 「사용 안 함」이 기본으로 보이고 회원이 가진 쿠폰이 이어서 보인다',
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

  await test.step('「쿠폰」을 확인한다', async () => {
    await verify('「쿠폰」에 「사용 안 함」이 보인다', await 주문하기.사용안함이름(), '사용 안 함');
  });

  await test.step('처음 쿠폰 할인을 확인한다', async () => {
    await verify('처음에는 「사용 안 함」이 기본이라 「쿠폰 할인 -0원」이 보인다', await 주문하기.쿠폰할인글(), '쿠폰 할인 -0원');
  });

  await test.step('「쿠폰」 목록을 확인한다', async () => {
    await verify('「쿠폰」에 「사용 안 함」 말고 회원이 가진 쿠폰이 하나 이상 보인다', (await 주문하기.쿠폰들()).length >= 1, true);
  }, { capture: true });
});

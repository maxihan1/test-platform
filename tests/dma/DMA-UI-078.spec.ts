import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 주문상품줄꼴인가, 옵션고르고수량바로구매열기 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-078',
  name: '「주문 상품」 줄은 「{상품명} ({옵션}) × {수량} {금액}」 꼴로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '옵션 있는 상품을 수량 2로 바로 구매했다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 색상과 사이즈 옵션이 있고 품절이 아닌 상품').default('데모 니트 가디건'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);

  await test.step('일반 회원 계정으로 로그인해 옵션 있는 상품을 수량 2로 바로 구매한다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await 옵션고르고수량바로구매열기(driver, params.상품이름, 2);
  });

  await test.step('주문하기 화면을 확인한다', async () => {
    await verify('옵션 있는 상품을 수량 2로 바로 구매했다', await 주문하기.보이나(), true, { blocker: true });
  });

  await test.step('「주문 상품」 줄을 확인한다', async () => {
    await verify(
      '「주문 상품」 줄은 「{상품명} ({옵션}) × {수량} {금액}」 꼴로 보인다',
      주문상품줄꼴인가(await 주문하기.주문상품줄글들(), params.상품이름, 2, true),
      true,
    );
  }, { capture: true });
});

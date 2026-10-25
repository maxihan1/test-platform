import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기, 보이게하기, 요소글 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-082',
  name: '주문하기 화면에 처음 주소 줄과 「주소 검색」 버튼이 보인다',
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

  await test.step('주소 줄을 확인한다', async () => {
    await verify('주소 줄은 처음에 「주소를 검색하세요」로 보인다', await 주문하기.주소줄글(), '주소를 검색하세요');
  });

  await test.step('주소 줄 옆을 확인한다', async () => {
    await 보이게하기(주문하기, await 주문하기.주소검색버튼.getElement());
    const 보임 = await verify('「주소 검색」 버튼이 보인다', await 주문하기.주소검색버튼.isDisplayed(), true);
    const 글 = await verify('버튼 글이 「주소 검색」이다', await 요소글(await 주문하기.주소검색버튼.getElement()), '주소 검색');
    await verify('주소 줄 옆에 「주소 검색」 버튼이 보인다', 보임 && 글, true);
  }, { capture: true });
});

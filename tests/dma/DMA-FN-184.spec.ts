import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니수량되돌리기, 장바구니열기 } from './helpers/cart.helper.js';
import { 더하기끝까지누르기, 오버핏후드티 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-184',
  name: '장바구니에서 수량이 1인 줄의 「−」는 눌리지 않는다',
  platforms: ['android'],
  precondition: ['장바구니에 수량이 1인 줄이 있다', '장바구니에 상품 줄이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 장바구니 = new 장바구니화면(driver);
  let 원래수량: number | undefined;

  try {
    await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
    });

    await test.step('장바구니를 연다', async () => {
      await 장바구니열기(driver);
      const 줄 = await 장바구니.줄찾기(오버핏후드티);
      await verify('장바구니에 수량이 1인 줄이 있다', 줄 === undefined ? 0 : await 장바구니.줄수량(줄), 1, { blocker: true });
      await verify('장바구니에 상품 줄이 있다', 줄 !== undefined, true, { blocker: true });
      원래수량 = 1;
    });

    await test.step('수량이 1인 줄의 「−」를 확인한다', async () => {
      await verify(
        '장바구니에서 수량이 1인 줄의 「−」는 눌리지 않는다',
        await 장바구니.줄빼기눌리나(await 장바구니.줄꼭찾기(오버핏후드티)),
        false,
      );
    }, { capture: true });

    await test.step('한 줄의 「+」를 눌리지 않을 때까지 누른 뒤 되돌린다', async () => {
      const 끝수량 = await 더하기끝까지누르기(driver, 장바구니, 오버핏후드티);
      await 장바구니수량되돌리기(driver, 오버핏후드티, 1);
      await verify('장바구니 수량은 「+」를 끝까지 눌러도 10을 넘지 않는다', 끝수량 <= 10, true);
    }, { capture: true });
  } finally {
    if (원래수량 !== undefined) await 장바구니수량되돌리기(driver, 오버핏후드티, 원래수량);
  }
});

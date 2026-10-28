import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 목록으로돌아가기, 장바구니수량되돌리기, 장바구니열기 } from './helpers/cart.helper.js';
import { 스마트워치 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-187',
  name: '장바구니 수량을 바꾸면 바로 저장되어 다시 열어도 바뀐 수량이 보인다',
  platforms: ['android'],
  precondition: ['장바구니에 상품 줄이 있다'],
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
      await verify('장바구니에 상품 줄이 있다', (await 장바구니.줄찾기(스마트워치)) !== undefined, true, { blocker: true });
    });

    await test.step('한 줄의 「+」를 누르고 장바구니를 다시 연다', async () => {
      const 앞수량 = await 장바구니.줄수량(await 장바구니.줄꼭찾기(스마트워치));
      원래수량 = 앞수량;
      await 장바구니.줄더하기(await 장바구니.줄꼭찾기(스마트워치));
      await 장바구니.수량이될때까지(스마트워치, 앞수량 + 1).catch(() => undefined);
      await 목록으로돌아가기(driver);
      await 장바구니열기(driver);
      const 뒤수량 = (await 장바구니.줄수량(await 장바구니.줄꼭찾기(스마트워치)));
      await verify('장바구니 수량을 바꾸면 바로 저장되어 다시 열어도 바뀐 수량이 보인다', 뒤수량, 앞수량 + 1);
    }, { capture: true });
  } finally {
    if (원래수량 !== undefined) await 장바구니수량되돌리기(driver, 스마트워치, 원래수량);
  }
});

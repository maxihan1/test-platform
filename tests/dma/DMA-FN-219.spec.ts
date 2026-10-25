import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-219',
  name: '체크한 줄이 없으면 「주문하기」 버튼이 눌리지 않는다',
  platforms: ['android'],
  techniques: ['결정 테이블'],
  precondition: ['장바구니의 모든 줄 체크가 풀려 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 장바구니 = new 장바구니화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('장바구니의 모든 줄 체크를 푼다', async () => {
    await 장바구니열기(driver);
    await verify('장바구니에 상품 줄이 있다', (await 장바구니.줄수()) > 0, true, { blocker: true });
    await 장바구니.모두끄기();
    await verify('장바구니의 모든 줄 체크가 풀려 있다', await 장바구니.체크한줄수(), 0, { blocker: true });
  });

  await test.step('「주문하기」 버튼을 확인한다', async () => {
    await verify('체크한 줄이 없으면 「주문하기」 버튼이 눌리지 않는다', await 장바구니.주문하기눌리나(), false);
  }, { capture: true });
});

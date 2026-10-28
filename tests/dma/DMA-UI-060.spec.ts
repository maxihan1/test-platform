import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 될때까지기다려보기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-UI-060',
  name: '「전체 선택」을 끄면 모든 줄의 체크가 풀린다',
  platforms: ['android'],
  precondition: ['장바구니에 상품 줄이 있다', '장바구니의 모든 줄 체크가 풀려 있다'],
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

  await test.step('장바구니를 연다', async () => {
    await 장바구니열기(driver);
    await verify('장바구니에 상품 줄이 있다', (await 장바구니.줄수()) > 0, true, { blocker: true });
  });

  await test.step('「전체 선택」을 눌러 끈다', async () => {
    await 장바구니.전체선택누르기();
    await 될때까지기다려보기(driver, async () => !(await 장바구니.전체선택했나()));
    await verify('「전체 선택」을 끄면 모든 줄의 체크가 풀린다', await 장바구니.체크한줄수(), 0);
  }, { capture: true });

  await test.step('「전체 선택」을 다시 눌러 켠다', async () => {
    await verify('장바구니의 모든 줄 체크가 풀려 있다', await 장바구니.체크한줄수(), 0, { blocker: true });
    await 장바구니.전체선택누르기();
    await 될때까지기다려보기(driver, async () => 장바구니.전체선택했나());
    await verify('「전체 선택」을 켜면 모든 줄이 체크된다', (await 장바구니.체크한줄수()) === (await 장바구니.줄수()), true);
  }, { capture: true });
});

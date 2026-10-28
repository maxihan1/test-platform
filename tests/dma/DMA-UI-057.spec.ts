import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니열기 } from './helpers/cart.helper.js';
import { 오버핏후드티, 옵션글꼴 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-057',
  name: '장바구니 줄마다 체크박스 · 상품명 · 줄 금액 · 「−」 · 수량 · 「+」가 보인다',
  platforms: ['android'],
  precondition: ['장바구니에 옵션 있는 상품 줄이 있다'],
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
    await verify('장바구니에 옵션 있는 상품 줄이 있다', (await 장바구니.줄찾기(오버핏후드티)) !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('장바구니 줄을 확인한다', async () => {
    const 보임들 = [];
    for (const 줄 of await 장바구니.줄들()) 보임들.push(await 장바구니.줄요소들보이나(줄));
    const 체크박스 = await verify('줄마다 체크박스가 보인다', 보임들.every((보임) => 보임.체크박스), true);
    const 상품명 = await verify('줄마다 상품명이 보인다', 보임들.every((보임) => 보임.상품명), true);
    const 줄금액 = await verify('줄마다 줄 금액이 보인다', 보임들.every((보임) => 보임.줄금액), true);
    const 빼기 = await verify('줄마다 「−」가 보인다', 보임들.every((보임) => 보임.빼기), true);
    const 수량 = await verify('줄마다 수량이 보인다', 보임들.every((보임) => 보임.수량), true);
    const 더하기 = await verify('줄마다 「+」가 보인다', 보임들.every((보임) => 보임.더하기), true);
    await verify(
      '장바구니 줄마다 체크박스 · 상품명 · 줄 금액 · 「−」 · 수량 · 「+」가 보인다',
      체크박스 && 상품명 && 줄금액 && 빼기 && 수량 && 더하기,
      true,
    );
  }, { capture: true });

  await test.step('옵션 있는 줄을 확인한다', async () => {
    const 줄 = await 장바구니.줄꼭찾기(오버핏후드티);
    const 글 = await 장바구니.줄글들(줄);
    await verify('옵션 있는 줄에는 옵션이 「{색상} / {사이즈}」 꼴로 보인다', 글.some((칸) => 옵션글꼴.test(칸)), true);
  });
});

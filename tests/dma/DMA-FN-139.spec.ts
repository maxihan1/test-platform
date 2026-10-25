import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품상세열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-139',
  name: '「+」를 누르면 수량이 1에서 2로 늘고 「−」를 누르면 1로 돌아간다',
  platforms: ['android'],
  precondition: ['상품 상세 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    product: z
      .string()
      .describe('열어 볼 상품 이름 — 옵션이 없고 품절이 아닌 상품')
      .default('USB-C 허브'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 상품 상세를 연다', async () => {
    await 상품상세열기(driver, params.product);
    await verify('상품 상세 화면이 보인다', await 상세.보이나(), true, { blocker: true });
  });

  await test.step('「+」를 누른 뒤 「−」를 누른다', async () => {
    const 처음 = await verify('처음 수량이 1이다', await 상세.수량값(), 1);
    await 상세.더하기();
    await 상세.수량이될때까지(2).catch(() => undefined);
    const 늘어남 = await verify('「+」를 누르면 수량이 2로 늘어난다', await 상세.수량값(), 2);
    await 상세.빼기();
    await 상세.수량이될때까지(1).catch(() => undefined);
    const 돌아옴 = await verify('「−」를 누르면 수량이 1로 돌아간다', await 상세.수량값(), 1);
    await verify('「+」를 누르면 수량이 1에서 2로 늘고 「−」를 누르면 1로 돌아간다', 처음 && 늘어남 && 돌아옴, true);
  });
});

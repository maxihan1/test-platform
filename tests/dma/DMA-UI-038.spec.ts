import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-038',
  name: '품절 상품 카드에는 「품절」이 붙어 보인다',
  platforms: ['android'],
  precondition: ['품절 상품이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    soldOutProduct: z
      .string()
      .describe('품절 상품 이름 — 「도서」 분류에 있는 품절 상품')
      .default('세계사 한 권'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('「도서」 칩을 누르고 품절 상품 카드를 확인한다', async () => {
    await 목록.분류고르기('도서');
    const 카드 = await 목록.상품카드찾기(params.soldOutProduct);
    await verify('품절 상품 카드에는 「품절」이 붙어 보인다', await 목록.카드품절글(카드), '품절');
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 총개수가바뀔때까지 } from './helpers/product-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-091',
  name: '「도서」 칩을 누르면 목록을 처음부터 다시 불러와 첫 상품의 분류가 「도서」다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 상품 목록이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
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

  await test.step('「도서」 칩을 누르고 첫 상품을 연다', async () => {
    const 전체글 = await 목록.총개수글();
    await 목록.분류고르기('도서');
    await 총개수가바뀔때까지(driver, 전체글);
    await 목록.첫상품열기();
    await 상세.열릴때까지();
    await verify('「도서」 칩을 누르면 목록을 처음부터 다시 불러와 첫 상품의 분류가 「도서」다', await 상세.분류글(), '도서');
  });
});

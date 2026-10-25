import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-055',
  name: '품절 상품 상세에는 「품절」 버튼이 눌리지 않는 상태로 보인다',
  platforms: ['android'],
  precondition: ['품절 상품 상세 화면이 떠 있다'],
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
  const 상세 = new 상품상세화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 품절 상품 상세를 연다', async () => {
    await 목록.분류고르기('도서');
    await 목록.상품열기(params.soldOutProduct);
    await 상세.열릴때까지();
    await verify('품절 상품 상세 화면이 보인다', await 상세.품절버튼보이나(), true, { blocker: true });
  });

  await test.step('품절 상품 상세 아래 버튼을 확인한다', async () => {
    const 보임 = await verify('「품절」 버튼이 보인다', await 상세.품절버튼글(), '품절');
    const 꺼짐 = await verify('「품절」 버튼이 눌리지 않는다', await 상세.품절버튼눌리나(), false);
    await verify('품절 상품 상세에는 「품절」 버튼이 눌리지 않는 상태로 보인다', 보임 && 꺼짐, true);
    const 담기 = await verify('「장바구니 담기」 버튼이 보이지 않는다', await 상세.담기보이나(), false);
    const 바로구매 = await verify('「바로 구매」 버튼이 보이지 않는다', await 상세.바로구매보이나(), false);
    await verify('품절 상품 상세에는 「장바구니 담기」 · 「바로 구매」 버튼이 보이지 않는다', 담기 && 바로구매, true);
  });
});

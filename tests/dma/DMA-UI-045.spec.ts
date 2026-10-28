import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품상세열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-045',
  name: '옵션 있는 상품 상세에 「색상」 · 「사이즈」 칩이 보인다',
  platforms: ['android'],
  precondition: ['옵션 있는 상품 상세 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    optionProduct: z
      .string()
      .describe('옵션 있는 상품 이름 — 색상 · 사이즈 칩이 있고 품절이 아닌 상품')
      .default('데모 니트 가디건'),
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

  await test.step('상품 목록에서 옵션 있는 상품 상세를 연다', async () => {
    await 상품상세열기(driver, params.optionProduct);
    await verify('옵션 있는 상품 상세 화면이 보인다', await 상세.옵션있나(), true, { blocker: true });
  });

  await test.step('옵션 칩을 확인한다', async () => {
    const 색상 = await verify('「색상」 칩이 보인다', (await 상세.칩수('색상')) > 0, true);
    const 사이즈 = await verify('「사이즈」 칩이 보인다', (await 상세.칩수('사이즈')) > 0, true);
    await verify('옵션 있는 상품 상세에 「색상」 · 「사이즈」 칩이 보인다', 색상 && 사이즈, true);
  });
});

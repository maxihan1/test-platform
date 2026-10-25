import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품상세열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-044',
  name: '할인 중인 상품은 판매가 앞에 원래 가격이 보인다',
  platforms: ['android'],
  precondition: ['할인 중인 상품 상세 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    discountProduct: z
      .string()
      .describe('할인 중인 상품 이름 — 상세에 원래 가격과 「{할인율}%」가 붙는 상품')
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

  await test.step('상품 목록에서 할인 중인 상품 상세를 연다', async () => {
    await 상품상세열기(driver, params.discountProduct);
    await verify('할인 중인 상품 상세 화면이 보인다', await 상세.보이나(), true, { blocker: true });
  });

  await test.step('판매가 앞을 확인한다', async () => {
    const 앞글 = await 상세.판매가앞글들();
    await verify('할인 중인 상품은 판매가 앞에 원래 가격이 보인다', 앞글.some((글) => /^\d{1,3}(,\d{3})*원$/.test(글)), true);
    await verify('할인 중인 상품은 판매가 앞에 「{할인율}%」가 보인다', 앞글.some((글) => /\d+%/.test(글)), true);
  });
});

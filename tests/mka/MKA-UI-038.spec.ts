import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품읽기 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-038',
  name: '할인 중인 상품 상세의 판매가 앞에 원래 가격과 「{할인율}%」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    할인상품번호: z.number().describe('할인 중인 상품 번호').default(1),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('할인 상품 상세를 연다', async () => {
    const 상품 = await 상품읽기(request, params.할인상품번호);
    await 목록.상품열기(상품.name);
    await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    await verify('고른 상품이 할인 중이다', 상품.discountRate > 0, true);
    const 글 = await 상세.화면글();
    const 원래가격 = await verify('원래 가격이 보인다', 글.includes(원(상품.price)), true);
    const 할인율 = await verify('「{할인율}%」가 보인다', 글.includes(`${상품.discountRate}%`), true);
    const 원래가격앞 = await verify('원래 가격이 판매가 앞에 놓인다', await 상세.글이판매가앞인가(원(상품.price)), true);
    const 할인율앞 = await verify('「{할인율}%」가 판매가 앞에 놓인다', await 상세.글이판매가앞인가(`${상품.discountRate}%`), true);
    await verify('할인 중인 상품 상세의 판매가 앞에 원래 가격과 「{할인율}%」가 보인다', 원래가격 && 할인율 && 원래가격앞 && 할인율앞, true);
  });
});

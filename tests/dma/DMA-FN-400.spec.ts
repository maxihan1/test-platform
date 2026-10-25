import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-400',
  name: '상품은 추천 순서로 보인다',
  platforms: ['android'],
  held: '판정 불가 — 추천 순서의 기준이 기획서에 없다',
  precondition: ['일반 회원 계정으로 로그인해 상품 목록이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    recommendOrder: z.string().describe('추천 순서대로 늘어선 상품 이름(쉼표로)'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('「전체」 목록을 확인한다', async () => {
    const 기대 = params.recommendOrder.split(',').map((글) => 글.trim());
    const 이름들 = await 목록.끝까지모은상품이름들();
    await verify('상품은 추천 순서로 보인다', 이름들.slice(0, 기대.length).join(', '), 기대.join(', '));
  });
});

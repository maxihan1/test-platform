import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-033',
  name: '분류 칩 아래에 「총 {N}개」가 보인다',
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

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('분류 칩 아래를 확인한다', async () => {
    const 글 = await verify('「총 {N}개」가 보인다', /^총 \d+개$/.test(await 목록.총개수글()), true);
    const 자리 = await verify('「총 {N}개」가 분류 칩 아래에 있다', (await 목록.총개수.getLocation()).y > (await 목록.분류칩세로자리('전체')), true);
    await verify('분류 칩 아래에 「총 {N}개」가 보인다', 글 && 자리, true);
  });
});

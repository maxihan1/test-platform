import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 총개수가바뀔때까지 } from './helpers/product-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-104',
  name: '상품이 10개인 분류는 목록 끝까지 내려도 상품이 10개다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['상품이 10개인 분류가 있다', '「전체」 상품이 10개보다 많다'],
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

  await test.step('「도서」 칩을 누르고 목록 끝까지 내린다', async () => {
    const 전체글 = await 목록.총개수글();
    await 목록.분류고르기('도서');
    await 총개수가바뀔때까지(driver, 전체글);
    const 이름들 = await 목록.끝까지모은상품이름들();
    await verify('상품이 10개인 분류는 목록 끝까지 내려도 상품이 10개다', 이름들.length, 10);
  });

  await test.step('「전체」 목록을 끝 가까이 내린다', async () => {
    const 도서글 = await 목록.총개수글();
    await 목록.분류고르기('전체');
    await 총개수가바뀔때까지(driver, 도서글);
    const 이름들 = await 목록.끝까지모은상품이름들();
    await verify('목록 끝 가까이 내리면 다음 상품을 더 붙여 11번째 상품이 보인다', 이름들.length > 10, true);
  });
});

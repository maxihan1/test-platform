import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 맨위줄 } from './components/top-bar.component.js';
import { 상품상세열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-042',
  name: '상품 상세 맨 위 줄에 「상품 상세」가 보인다',
  platforms: ['android'],
  precondition: ['상품 상세 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    product: z
      .string()
      .describe('옵션 없는 상품 이름 — 옵션이 없고 품절이 아닌 상품')
      .default('USB-C 허브'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 상품 상세를 연다', async () => {
    const 상세 = await 상품상세열기(driver, params.product);
    await verify('상품 상세 화면이 보인다', await 상세.보이나(), true, { blocker: true });
  });

  await test.step('상품 상세 맨 위 줄을 확인한다', async () => {
    await verify('상품 상세 맨 위 줄에 「상품 상세」가 보인다', await new 맨위줄(driver).제목글(), '상품 상세');
  });
});

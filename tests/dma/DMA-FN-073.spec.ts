import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-073',
  name: '맞는 아이디와 비밀번호로 로그인하면 상품 목록이 보인다',
  platforms: ['android'],
  smoke: true,
  precondition: ['로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면을 확인한다', async () => {
    await 로그인.열릴때까지();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.보이나(), true, { blocker: true });
  });

  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
    await 목록.열릴때까지();
    await verify('맞는 아이디와 비밀번호로 로그인하면 상품 목록이 보인다', await 목록.보이나(), true);
  }, { capture: true });
});

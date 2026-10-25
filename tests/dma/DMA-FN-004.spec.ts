import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱다시켜기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-004',
  name: '로그인한 뒤 앱을 끄고 다시 켜면 다시 로그인 화면이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 로그인 = new 로그인화면(driver);

  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('앱을 끄고 다시 켠다', async () => {
    await 앱다시켜기(driver);
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('로그인한 뒤 앱을 끄고 다시 켜면 다시 로그인 화면이 보인다', await 로그인.보이나(), true);
  }, { capture: true });
});

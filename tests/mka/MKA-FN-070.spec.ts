import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-070',
  name: '맞는 아이디와 비밀번호로 로그인하면 상품 목록으로 간다',
  platforms: ['android'],
  precondition: ['앱이 새로 켜졌다'],
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
    await 로그인.제목나올때까지();
    await verify('로그인 화면이 보인다', await 로그인.보이는가(), true, { blocker: true });
  });

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
    await 목록.열릴때까지();
    await verify('맞는 아이디와 비밀번호로 로그인하면 상품 목록으로 간다', await 목록.보이는가(), true);
  });
});

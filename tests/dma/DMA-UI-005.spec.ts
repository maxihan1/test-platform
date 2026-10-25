import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱다시켜기, 앱이닫힐때까지, 앱이앞에있나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-005',
  name: '로그인 화면에서 기기의 뒤로 가기를 누르면 앱이 닫힌다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다', '일반 회원 계정으로 로그인해 상품 목록이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면을 연다', async () => {
    await 앱다시켜기(driver);
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('로그인 화면이 보인다', await 로그인.보이나(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 기기의 뒤로 가기를 누른다', async () => {
    await driver.back();
    await 앱이닫힐때까지(driver);
    await verify('로그인 화면에서 기기의 뒤로 가기를 누르면 앱이 닫힌다', !(await 앱이앞에있나(driver)), true);
  });

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 앱다시켜기(driver);
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 기기의 뒤로 가기를 누른다', async () => {
    await driver.back();
    await 앱이닫힐때까지(driver);
    await verify('상품 목록에서 기기의 뒤로 가기를 누르면 앱이 닫힌다', !(await 앱이앞에있나(driver)), true);
  }, { capture: true });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-004',
  name: '상품 상세에서 기기의 뒤로 가기를 누르면 상품 목록으로 돌아간다',
  platforms: ['android'],
  precondition: ['상품 상세 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 상세 화면을 연다', async () => {
    await 목록.첫상품열기();
    await 상세.열릴때까지().catch(() => undefined);
    await verify('상품 상세 화면이 보인다', await 상세.보이나(), true, { blocker: true });
  });

  await test.step('상품 상세에서 기기의 뒤로 가기를 누른다', async () => {
    await driver.back();
    await 목록.열릴때까지().catch(() => undefined);
    await verify('상품 상세에서 기기의 뒤로 가기를 누르면 상품 목록으로 돌아간다', await 목록.보이나(), true);
  }, { capture: true });
});

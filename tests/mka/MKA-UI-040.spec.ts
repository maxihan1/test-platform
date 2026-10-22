import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품읽기 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-040',
  name: '옵션 상품 상세를 처음 열면 골라진 옵션 칩이 없다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션상품번호: z.number().describe('색상 · 사이즈 옵션이 있는 상품 번호').default(1),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('옵션 상품 상세를 연다', async () => {
    const 상품 = await 상품읽기(request, params.옵션상품번호);
    await 목록.상품열기(상품.name);
    await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    await 상세.색상칩찾기();
    const 색상칩 = await verify('「색상」 칩이 보인다', (await 상세.색상칩글들()).length > 0, true);
    const 색상없음 = await verify('골라진 「색상」 칩이 없다', await 상세.골라진색상수(), 0);
    await 상세.사이즈칩찾기();
    const 사이즈칩 = await verify('「사이즈」 칩이 보인다', (await 상세.사이즈칩글들()).length > 0, true);
    const 사이즈없음 = await verify('골라진 「사이즈」 칩이 없다', await 상세.골라진사이즈수(), 0);
    await verify('옵션 상품 상세를 처음 열면 골라진 옵션 칩이 없다', 색상칩 && 색상없음 && 사이즈칩 && 사이즈없음, true);
  });
});

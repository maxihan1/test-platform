import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-115',
  name: '상품을 불러오는 동안 목록 끝에 도는 표시가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  held: '보류 — 앱이 부르는 상품 응답을 늦출 길이 없다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품 목록을 연다', async () => {
    await 목록.장바구니버튼.click();
    await new 장바구니화면(driver).열릴때까지();
    await new 머리줄(driver).뒤로누르기();
    await verify('상품을 불러오는 동안 목록 끝에 도는 표시가 보인다', await 목록.불러오는표시보이나(), true);
  });
});

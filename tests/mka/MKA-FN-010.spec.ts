import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 기기뒤로가기 } from './helpers/screen-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-010',
  name: '장바구니에서 「←」를 누르면 상품 목록으로 돌아간다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 머리 = new 머리줄(driver);
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);
  const 장바구니 = new 장바구니화면(driver);

  await test.step('일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, {
      blocker: true,
    });
  });

  await test.step('상품 목록에서 「장바구니」를 누른다', async () => {
    await 목록.장바구니버튼.click();
    await verify('장바구니 화면이 보인다', await 장바구니.열릴때까지(), true, { blocker: true });
  });

  await test.step('장바구니에서 「←」를 누른다', async () => {
    await 머리.뒤로누르기();
    await 목록.열릴때까지();
    await verify('장바구니에서 「←」를 누르면 상품 목록으로 돌아간다', await 목록.보이는가(), true);
  });

  await test.step('상품 목록에서 상품 상세를 연다', async () => {
    await 목록.첫카드누르기();
    await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
  });

  await test.step('상품 상세에서 기기의 뒤로 가기를 누른다', async () => {
    await 기기뒤로가기(driver);
    await 목록.열릴때까지();
    await verify('상품 상세에서 기기의 뒤로 가기를 누르면 상품 목록으로 돌아간다', await 목록.보이는가(), true);
  });
});

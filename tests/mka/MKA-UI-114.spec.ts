import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 제목이될때까지 } from './helpers/list-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-114',
  name: '상품 목록 버튼 반응',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 머리 = new 머리줄(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품 목록에서 「장바구니」를 누른다', async () => {
    await 목록.장바구니버튼.click();
    await verify('상품 목록에서 「장바구니」를 누르면 장바구니 화면으로 간다', await new 장바구니화면(driver).열릴때까지(), true);
    await 머리.뒤로누르기();
    await 목록.열릴때까지();
  });

  await test.step('상품 목록에서 「주문 내역」을 누른다', async () => {
    await 목록.주문내역버튼.click();
    await verify('상품 목록에서 「주문 내역」을 누르면 주문 내역 화면으로 간다', await 제목이될때까지(driver, '주문 내역'), true);
    await 머리.뒤로누르기();
    await 목록.열릴때까지();
  });

  await test.step('상품 목록에서 「패션」 칩을 누른다', async () => {
    await 목록.칩누르기('패션');
    await verify('상품 목록에서 「패션」 칩을 누르면 그 칩이 골라진다', await 목록.칩골라질때까지('패션'), true);
  });

  await test.step('상품 목록에서 상품 카드를 누른다', async () => {
    await 목록.첫카드누르기();
    await verify('상품 목록에서 상품 카드를 누르면 상품 상세로 간다', await new 상품상세화면(driver).열릴때까지(), true);
  });
});

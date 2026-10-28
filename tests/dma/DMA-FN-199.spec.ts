import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 될때까지기다려보기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-199',
  name: '확인 창에서 「취소」를 누르면 창이 닫히고 장바구니 줄은 그대로다',
  platforms: ['android'],
  precondition: ['장바구니에 상품 줄이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 장바구니 = new 장바구니화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('장바구니를 연다', async () => {
    await 장바구니열기(driver);
    await verify('장바구니에 상품 줄이 있다', (await 장바구니.줄수()) > 0, true, { blocker: true });
  });

  await test.step('「선택 삭제」를 누른 뒤 「취소」를 누른다', async () => {
    const 앞줄들 = (await 장바구니.줄이름들()).join(', ');
    await 장바구니.선택삭제누르기();
    await 장바구니.확인창뜰때까지().catch(() => undefined);
    await 장바구니.확인창취소.click();
    await 될때까지기다려보기(driver, async () => !(await 장바구니.확인창보이나()));
    const 닫힘 = await verify('창이 닫힌다', await 장바구니.확인창보이나(), false);
    const 그대로 = await verify('장바구니 줄은 그대로다', (await 장바구니.줄이름들()).join(', '), 앞줄들);
    await verify('확인 창에서 「취소」를 누르면 창이 닫히고 장바구니 줄은 그대로다', 닫힘 && 그대로, true);
  }, { capture: true });
});

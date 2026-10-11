import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-092',
  name: '줄을 모두 끄면 「주문하기」 가 눌리지 않는다',
  platforms: ['desktop'],
  precondition: ['회원 장바구니에 상품 두 줄이 담겨 있다'],
  techniques: ['결정 테이블'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 머리 = new 머리글(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('장바구니 화면을 연다', async () => {
    await 장바구니.열기();
    await verify('장바구니에 상품 두 줄이 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
  });

  await test.step('장바구니 줄을 모두 끈다', async () => {
    await 장바구니.전체선택.uncheck();
    await verify('줄을 모두 끄면 「주문하기」 가 눌리지 않는다', await 장바구니.주문하기.isDisabled(), true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니담기, 장바구니비우기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 옵션없는상품번호 } from './helpers/shop.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-002',
  name: '장바구니가 0개인 회원이 홈 화면을 열면 장바구니 배지가 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['장바구니가 빈 두 번째 회원으로 로그인해 있다'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  try {
    await test.step('장바구니가 빈 두 번째 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 화면로그인(page, 둘째아이디, params.password ?? '');
      await 장바구니비우기(page.request);
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('회원 장바구니에 담긴 상품이 없다', (await 장바구니읽기(page.request)).length, 0, { blocker: true });
    });

    await test.step('장바구니가 빈 회원으로 홈 화면을 연다', async () => {
      const 응답 = page.waitForResponse((r) => r.url().endsWith('/api/cart') && r.request().method() === 'GET');
      await 홈.열기();
      await 응답;
      await verify('장바구니가 0개인 회원이 홈 화면을 열면 장바구니 배지가 보이지 않는다', await 머리.장바구니배지.isVisible(), false);
    });

    await test.step('상품 하나를 장바구니에 담고 홈 화면을 다시 연다', async () => {
      await 장바구니담기(page.request, { productId: 옵션없는상품번호, qty: 1 });
      await 홈.열기();
      await 머리.장바구니배지.filter({ hasText: '1' }).waitFor();
      await verify(
        '장바구니에 상품 하나를 담고 홈 화면을 열면 장바구니 배지에 「1」 이 보인다',
        { 보임: await 머리.장바구니배지.isVisible(), 숫자: await 머리.장바구니배지.innerText() },
        { 보임: true, 숫자: '1' },
      );
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});

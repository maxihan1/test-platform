import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니담기, 장바구니비우기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 옵션없는상품번호 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-093',
  name: '장바구니가 비어 있으면 「장바구니가 비어 있습니다」 와 「쇼핑하러 가기」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['장바구니가 빈 두 번째 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 머리 = new 머리글(page);

  try {
    await test.step('두 번째 회원으로 로그인하고 장바구니를 비운다', async () => {
      await 방해막기(page);
      await 화면로그인(page, 둘째아이디, params.password ?? '');
      await 장바구니비우기(page.request);
    });

    await test.step('장바구니가 비었는지 확인한다', async () => {
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('장바구니가 비어 있다', (await 장바구니읽기(page.request)).length, 0, { blocker: true });
    });

    await test.step('장바구니가 빈 회원으로 장바구니 화면을 연다', async () => {
      await 장바구니.열기();
      await verify(
        '장바구니가 비어 있으면 「장바구니가 비어 있습니다」 와 「쇼핑하러 가기」 버튼이 보인다',
        { 안내: await 장바구니.빈안내.isVisible(), 버튼: await 장바구니.쇼핑하러가기.isVisible() },
        { 안내: true, 버튼: true },
      );
    });

    await test.step('상품 하나를 담고 장바구니 화면을 다시 연다', async () => {
      await 장바구니담기(page.request, { productId: 옵션없는상품번호, qty: 1 });
      await 장바구니.열기();
      await verify(
        '장바구니에 상품이 하나 생기면 빈 장바구니 안내 대신 그 줄이 보인다',
        { 빈안내: await 장바구니.빈안내.isVisible(), 줄: await 장바구니.줄들.count() },
        { 빈안내: false, 줄: 1 },
      );
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});

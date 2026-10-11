import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니비우기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 상품읽기, 옵션상품번호 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-085',
  name: '같은 상품 · 같은 옵션을 합 10이 되게 다시 담으면 장바구니에 한 줄 수량 10으로 보인다',
  platforms: ['desktop'],
  precondition: ['장바구니가 빈 두 번째 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 상세 = new 상품상세화면(page);
  const 장바구니 = new 장바구니화면(page);
  const 머리 = new 머리글(page);
  const 상품 = await 상품읽기(request, 옵션상품번호);

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

    await test.step('같은 상품 · 같은 옵션을 수량 합 10이 되게 두 번 담는다', async () => {
      await 상세.열기(옵션상품번호);
      await 상세.옵션고르기('블랙', 'M');
      await 상세.수량적기(6);
      await 상세.담고응답받기();
      await 상세.수량적기(4);
      await 상세.담고응답받기();
      await 장바구니.열기();
      await verify(
        '같은 상품 · 같은 옵션을 합 10이 되게 다시 담으면 장바구니에 한 줄 수량 10으로 보인다',
        { 줄수: await 장바구니.줄들.count(), 수량: await 장바구니.줄수량칸(상품.name).inputValue() },
        { 줄수: 1, 수량: '10' },
      );
    });

    await test.step('같은 상품 · 같은 옵션을 한 개 더 담는다', async () => {
      await 상세.열기(옵션상품번호);
      await 상세.옵션고르기('블랙', 'M');
      await 상세.담고응답받기();
      await 장바구니.열기();
      await verify('같은 상품 · 같은 옵션 합이 11이 되게 담아도 그 줄 수량은 10에서 멈춘다', await 장바구니.줄수량칸(상품.name).inputValue(), '10');
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});

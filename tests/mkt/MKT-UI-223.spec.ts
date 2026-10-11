import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니읽기 } from './helpers/cart.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-223',
  name: '장바구니 줄에 이미지 · 상품명 · 옵션 · 수량 · 금액이 보인다',
  platforms: ['desktop'],
  precondition: ['회원 장바구니에 상품 두 줄이 담겨 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 머리 = new 머리글(page);
  let 줄들: Awaited<ReturnType<typeof 장바구니읽기>> = [];

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('장바구니에 담긴 상품을 확인한다', async () => {
    줄들 = await 장바구니읽기(page.request);
    await verify('회원 장바구니에 상품 두 줄이 담겨 있다', 줄들.length, 2, { blocker: true });
  });

  await test.step('회원으로 장바구니 화면을 연다', async () => {
    await 장바구니.열기();
    const 옵션줄 = 줄들.find((줄) => 줄.color !== '' || 줄.size !== '');
    const 옵션글 = [옵션줄?.color, 옵션줄?.size].filter(Boolean).join(' / ');
    await verify(
      '장바구니 줄에 이미지 · 상품명 · 옵션 · 수량 · 금액이 보인다',
      await 장바구니.줄요소보임(옵션줄?.name ?? '', 옵션글),
      ['이미지', '상품명', '옵션', '수량', '금액'],
    );
    const 체크 = await 장바구니.체크상태들();
    await verify(
      '장바구니 줄마다 체크박스가 있고 처음에 모두 켜져 있다',
      { 체크박스: 체크.length, 켜짐: 체크.filter(Boolean).length },
      { 체크박스: 줄들.length, 켜짐: 줄들.length },
    );
    await verify(
      '장바구니 결제 요약에 「상품 금액」 · 「배송비」 · 「결제 예정 금액」 이 보인다',
      await 장바구니.요약항목보임(),
      ['상품 금액', '배송비', '결제 예정 금액'],
    );
  });
});

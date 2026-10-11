import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니되돌리기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 보일때까지기다림, 옵션상품번호, 옵션없는상품번호 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-081',
  name: '옵션을 모두 고르고 담으면 장바구니에 그 옵션 줄이 생긴다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 주문서 = new 주문서화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  let 처음: Awaited<ReturnType<typeof 장바구니읽기>> = [];

  const 배지숫자 = async (): Promise<number> => ((await 머리.장바구니배지.isVisible()) ? Number((await 머리.장바구니배지.innerText()).replace(/\D/g, '')) : 0);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      처음 = await 장바구니읽기(page.request);
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('옵션 상품에서 「색상」 · 「사이즈」 를 모두 고르고 「장바구니 담기」 를 누른다', async () => {
      await 상세.열기(옵션상품번호);
      const 전 = await 배지숫자();
      await 상세.옵션고르기('블랙', 'M');
      await 상세.담고응답받기();
      await 보일때까지기다림(알림.글('장바구니에 담았습니다'));
      const 토스트보임 = await 알림.글('장바구니에 담았습니다').first().isVisible();
      const 담김 = (await 장바구니읽기(page.request)).some((줄) => 줄.productId === 옵션상품번호 && 줄.color === '블랙' && 줄.size === 'M');
      await verify('옵션을 모두 고르고 담으면 장바구니에 그 옵션 줄이 생긴다', 담김, true);
      await verify('「장바구니 담기」 를 누르면 토스트 「장바구니에 담았습니다」 가 보인다', 토스트보임, true);
      await 보일때까지기다림(머리.장바구니배지.filter({ hasText: String(전 + 1) }));
      await verify('「장바구니 담기」 를 누르면 머리글 장바구니 배지 숫자가 하나 늘어난다', await 배지숫자(), 전 + 1);
    });

    await test.step('옵션 없는 상품에서 「바로 구매」 를 누른다', async () => {
      await 상세.열기(옵션없는상품번호);
      await 상세.바로구매.click();
      await 주문서.제목.waitFor();
      const 주소 = new URL(page.url());
      const 직접 = JSON.parse(주소.searchParams.get('direct') ?? '{}') as { productId?: number };
      await verify(
        '「바로 구매」 를 누르면 그 상품만 담긴 주문서로 간다',
        { 경로: 주소.pathname, 상품번호: 직접.productId, 장바구니줄: 주소.searchParams.get('items') },
        { 경로: '/checkout', 상품번호: 옵션없는상품번호, 장바구니줄: null },
      );
    });
  } finally {
    await 장바구니되돌리기(page.request, 처음);
  }
});

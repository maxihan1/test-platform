import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 장바구니되돌리기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 옵션상품번호, 옵션없는상품번호 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-142',
  name: '상품 목록을 조건을 넣어 요청하면 그 조건에 맞는 상품만 온다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

interface 목록상품 {
  category: string;
  salePrice: number;
  soldOut: boolean;
}

test(spec, async ({ request, params }) => {
  let 처음: Awaited<ReturnType<typeof 장바구니읽기>> = [];
  let 장바구니건드림 = false;

  try {
    await test.step('회원으로 로그인한다', async () => {
      await verify('로그인 응답 코드가 200이다', await API로그인(request, params.loginId ?? '', params.password ?? ''), 200, { blocker: true });
    });

    await test.step('상품 목록 API 를 category · maxPrice · excludeSoldOut · sort 를 넣어 요청한다', async () => {
      const 응답 = await request.get('/api/products', { params: { category: '도서', maxPrice: 300000, excludeSoldOut: 'true', sort: 'priceAsc' } });
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 상품들 = ((await 응답.json()) as { items: 목록상품[] }).items;
      const 가격들 = 상품들.map((상품) => 상품.salePrice);
      await verify(
        '상품 목록을 조건을 넣어 요청하면 그 조건에 맞는 상품만 온다',
        {
          한건이상: 상품들.length > 0,
          조건에맞음: 상품들.every((상품) => 상품.category === '도서' && 상품.salePrice <= 300000 && !상품.soldOut),
          낮은가격순: 가격들.every((값, 번호) => 번호 === 0 || 가격들[번호 - 1] <= 값),
        },
        { 한건이상: true, 조건에맞음: true, 낮은가격순: true },
      );
    });

    await test.step('상품 상세 API 를 요청한다', async () => {
      const 응답 = await request.get(`/api/products/${옵션상품번호}`);
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 본문 = (await 응답.json()) as Record<string, unknown>;
      const 키들 = Object.keys(본문);
      const 든것: string[] = [];
      if (키들.some((키) => /image|img/i.test(키))) 든것.push('이미지');
      if ('colors' in 본문 && 'sizes' in 본문) 든것.push('옵션');
      if ('stock' in 본문) 든것.push('재고');
      if ('qna' in 본문) 든것.push('문의');
      await verify('상품 상세를 요청하면 이미지 · 옵션 · 재고 · 문의가 든 응답이 온다', 든것, ['이미지', '옵션', '재고', '문의']);
    });

    await test.step('리뷰 목록 API 를 요청한다', async () => {
      const 응답 = await request.get(`/api/products/${옵션상품번호}/reviews`);
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      await verify('리뷰 목록을 요청하면 리뷰 목록이 든 응답이 온다', Array.isArray(((await 응답.json()) as { items?: unknown }).items), true);
    });

    await test.step('쿠폰 목록 API 를 요청한다', async () => {
      const 응답 = await request.get('/api/coupons');
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      await verify('로그인한 채 쿠폰 목록을 요청하면 보유 쿠폰 두 가지가 온다', ((await 응답.json()) as { items: unknown[] }).items.length, 2);
    });

    await test.step('장바구니 조회 · 담기 · 수량 변경 · 삭제 API 를 차례로 요청한다', async () => {
      처음 = await 장바구니읽기(request);
      장바구니건드림 = true;
      const 조회 = await request.get('/api/cart');
      const 담기 = await request.post('/api/cart', { data: { productId: 옵션없는상품번호, color: '', size: '', qty: 1 } });
      const 새줄 = (await 장바구니읽기(request)).find((줄) => 줄.productId === 옵션없는상품번호);
      const 수량변경 = await request.patch(`/api/cart/${새줄?.id ?? 0}`, { data: { qty: 2 } });
      const 삭제 = await request.delete(`/api/cart/${새줄?.id ?? 0}`);
      const 코드들 = [조회.status(), 담기.status(), 수량변경.status(), 삭제.status()];
      await verify(
        '장바구니 조회 · 담기 · 수량 변경 · 삭제를 차례로 요청하면 모두 성공으로 응답한다',
        코드들.every((코드) => 코드 >= 200 && 코드 < 300),
        true,
      );
    });

    await test.step('내 주문 목록과 주문 상세 API 를 요청한다', async () => {
      const 목록 = await request.get('/api/orders?period=all');
      const 주문들 = ((await 목록.json()) as { items: { id: string }[] }).items;
      const 상세 = await request.get(`/api/orders/${주문들[0]?.id ?? ''}`);
      await verify(
        '내 주문 목록을 period=all 로 요청하면 내 주문이 오고 그 주문 상세도 온다',
        { 목록: 목록.status() === 200 && 주문들.length > 0, 상세: 상세.status() === 200 && ((await 상세.json()) as { id: string }).id === 주문들[0]?.id },
        { 목록: true, 상세: true },
      );
    });

    await test.step('주소 검색 API 를 두 글자로 요청한다', async () => {
      const 응답 = await request.get('/api/address', { params: { q: '강남' } });
      await verify(
        '주소 검색을 두 글자로 요청하면 가상 주소 목록이 온다',
        { 코드: 응답.status(), 한건이상: ((await 응답.json()) as { items?: unknown[] }).items?.length !== 0 },
        { 코드: 200, 한건이상: true },
      );
    });
  } finally {
    if (장바구니건드림) await 장바구니되돌리기(request, 처음);
  }
});

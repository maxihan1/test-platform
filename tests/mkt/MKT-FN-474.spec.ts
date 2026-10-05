import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 배송정보, 상품번호, 장바구니담기, 장바구니비우기, 장바구니조회, 주문취소 } from './components/data.component.js';
import { 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-474',
  name: '재고가 부족하면 주문 요청이 409 로 응답한다',
  precondition: ['새로 만든 회원 둘이 있다', '둘 다 장바구니에 재고 1개인 상품을 담았다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page, request }) => {
  const 정리 = new 정리함();
  try {
    const 주문본문 = async (api: typeof request) => ({
      shipping: 배송정보(),
      payment: { method: '계좌이체', cardCompany: '', installment: '' },
      couponId: '',
      cartItemIds: (await 장바구니조회(api)).map((줄) => 줄.id),
    });

    await test.step('새로 만든 회원 둘로 로그인하고 재고 1개인 상품을 각자 장바구니에 담는다', async () => {
      await 회원로그인(request, 정리);
      await 회원로그인(page.request, 정리);
      for (const api of [request, page.request]) {
        정리.더하기(() => 장바구니비우기(api));
        await 장바구니담기(api, 상품번호.콜드브루);
      }
      await verify('두 회원의 장바구니에 같은 상품이 한 줄씩 있다', [(await 장바구니조회(request)).length, (await 장바구니조회(page.request)).length], [1, 1], { blocker: true });
    });

    await test.step('둘째 회원이 먼저 주문한 뒤 첫째 회원이 주문 POST 를 보낸다', async () => {
      const 먼저 = await page.request.post('/api/orders', { data: await 주문본문(page.request) });
      const 먼저본문 = (await 먼저.json()) as { id?: unknown };
      if (typeof 먼저본문.id === 'string') {
        const 주문번호 = 먼저본문.id;
        정리.더하기(() => 주문취소(page.request, 주문번호));
      }
      await verify('둘째 회원의 주문이 201 로 응답한다', 먼저.status(), 201, { blocker: true });
      const res = await request.post('/api/orders', { data: await 주문본문(request) });
      await verify('재고가 부족하면 주문 요청이 409 로 응답한다', res.status(), 409);
    });
  } finally {
    await 정리.비우기();
  }
});

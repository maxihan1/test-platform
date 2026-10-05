import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 배송정보, 상품번호, 장바구니담기, 장바구니비우기, 장바구니조회, 주문취소 } from './components/data.component.js';
import { 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-472',
  name: '주문 요청은 201 과 주문번호로 응답한다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 12,900원 상품 한 줄이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 정리 = new 정리함();
  try {
    await test.step('새로 만든 회원으로 로그인하고 12,900원 상품을 장바구니에 담는다', async () => {
      await 회원로그인(request, 정리);
      정리.더하기(() => 장바구니비우기(request));
      await 장바구니담기(request, 상품번호.USB허브);
      await verify('장바구니에 한 줄이 있다', (await 장바구니조회(request)).map((줄) => 줄.unitPrice), [12900], { blocker: true });
    });

    await test.step('주문 POST /api/orders 를 보낸다', async () => {
      const 줄들 = await 장바구니조회(request);
      const res = await request.post('/api/orders', {
        data: {
          shipping: 배송정보(),
          payment: { method: '계좌이체', cardCompany: '', installment: '' },
          couponId: '',
          cartItemIds: 줄들.map((줄) => 줄.id),
        },
      });
      const 본문 = (await res.json()) as { id?: unknown };
      if (typeof 본문.id === 'string') {
        const 주문번호 = 본문.id;
        정리.더하기(() => 주문취소(request, 주문번호));
      }
      await verify(
        '주문 요청은 201 과 주문번호로 응답한다',
        { 응답: res.status(), 주문번호: typeof 본문.id === 'string' && 본문.id.length > 0 },
        { 응답: 201, 주문번호: true },
      );
    });
  } finally {
    await 정리.비우기();
  }
});

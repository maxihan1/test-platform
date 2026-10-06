import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품번호, 장바구니담기, 장바구니비우기, 장바구니주문, 주문취소 } from './components/data.component.js';
import { 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-480',
  name: '결제완료가 아닌 주문의 취소 요청은 409 로 응답한다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '결제완료 주문이 하나 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 정리 = new 정리함();
  try {
    let 주문번호 = '';

    await test.step('새로 만든 회원으로 로그인하고 결제완료 주문을 만든다', async () => {
      await 회원로그인(request, 정리);
      정리.더하기(() => 장바구니비우기(request));
      await 장바구니담기(request, 상품번호.USB허브);
      주문번호 = (await 장바구니주문(request)).id;
      정리.더하기(() => 주문취소(request, 주문번호));
      const 상세 = (await (await request.get(`/api/orders/${encodeURIComponent(주문번호)}`)).json()) as { status: string };
      await verify('주문 상태가 「결제완료」다', 상세.status, '결제완료', { blocker: true });
    });

    await test.step('이미 취소한 그 주문에 취소 POST 를 한 번 더 보낸다', async () => {
      const 첫취소 = await request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
      await verify('첫 취소 요청은 200 으로 응답한다', 첫취소.status(), 200, { blocker: true });
      const res = await request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
      await verify('결제완료가 아닌 주문의 취소 요청은 409 로 응답한다', res.status(), 409);
    });
  } finally {
    await 정리.비우기();
  }
});

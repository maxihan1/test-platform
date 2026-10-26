import { defineCase, test, verify } from '@platform/kit';

import { 장바구니담기, 장바구니비우기, 옵션없는상품 } from './helpers/data.helper.js';
import { 요청로그인한일회용회원, 주문요청, 주문취소요청 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-381',
  name: '결제완료 주문을 취소 API 로 부르면 상태가 주문취소가 된다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 주문번호 = '';

  try {
    await test.step('일회용 회원으로 로그인해 결제완료 주문을 만든다', async () => {
      await 요청로그인한일회용회원(request);
      await verify('일회용 회원으로 로그인해 있다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
      const 줄번호 = await 장바구니담기(request, { productId: (await 옵션없는상품(request)).id, qty: 1 });
      const 응답 = await 주문요청(request, { cartItemIds: [줄번호] });
      await verify('주문 응답 코드가 201이다', 응답.status(), 201, { blocker: true });
      주문번호 = ((await 응답.json()) as { id: string }).id;
      const 상세 = (await (await request.get(`/api/orders/${encodeURIComponent(주문번호)}`)).json()) as { status: string };
      await verify('만든 주문의 상태가 결제완료다', 상세.status, '결제완료', { blocker: true });
    });

    await test.step('결제완료 주문으로 POST /api/orders/{id}/cancel 을 부른다', async () => {
      const 응답 = await 주문취소요청(request, 주문번호);
      await verify('취소 응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 상세 = (await (await request.get(`/api/orders/${encodeURIComponent(주문번호)}`)).json()) as { status: string };
      await verify('결제완료 주문을 취소 API 로 부르면 상태가 주문취소가 된다', 상세.status, '주문취소');
    });
  } finally {
    await 장바구니비우기(request);
  }
});

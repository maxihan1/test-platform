import { defineCase, test, verify } from '@platform/kit';

import { 장바구니담기, 장바구니비우기, 옵션없는상품 } from './helpers/data.helper.js';
import { 요청로그인한일회용회원, 주문요청, 주문취소요청 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-379',
  name: '내 주문 목록 API 에 방금 만든 주문이 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 주문번호 = '';
  let 상품번호 = 0;

  try {
    await test.step('일회용 회원으로 로그인해 주문 하나를 만든다', async () => {
      await 요청로그인한일회용회원(request);
      await verify('일회용 회원으로 로그인해 있다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
      상품번호 = (await 옵션없는상품(request)).id;
      const 줄번호 = await 장바구니담기(request, { productId: 상품번호, qty: 1 });
      const 응답 = await 주문요청(request, { cartItemIds: [줄번호] });
      await verify('주문 응답 코드가 201이다', 응답.status(), 201, { blocker: true });
      주문번호 = ((await 응답.json()) as { id: string }).id;
    });

    await test.step('주문 하나를 만든 뒤 GET /api/orders?period=all 을 부른다', async () => {
      const 응답 = await request.get('/api/orders?period=all');
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 번호들 = ((await 응답.json()) as { items: { id: string }[] }).items.map((주문) => 주문.id);
      await verify('내 주문 목록 API 에 방금 만든 주문이 있다', 번호들, [주문번호]);
    });

    await test.step('GET /api/orders/{id} 로 방금 만든 주문을 부른다', async () => {
      const 응답 = await request.get(`/api/orders/${encodeURIComponent(주문번호)}`);
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 상품들 = ((await 응답.json()) as { lines: { productId: number }[] }).lines.map((줄) => 줄.productId);
      await verify('내 주문 상세 API 는 그 주문의 상품 목록을 돌려준다', 상품들, [상품번호]);
    });
  } finally {
    if (주문번호 !== '') await 주문취소요청(request, 주문번호);
    await 장바구니비우기(request);
  }
});

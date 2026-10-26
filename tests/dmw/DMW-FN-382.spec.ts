import { defineCase, test, verify } from '@platform/kit';

import { 새창묶음 } from './helpers/common-tools.helper.js';
import { 장바구니담기, 장바구니비우기, 옵션없는상품 } from './helpers/data.helper.js';
import { 요청로그인한일회용회원, 주문요청, 주문취소요청 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-382',
  name: '결제완료가 아닌 주문을 취소하면 409 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다', '비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  const 손님 = await 새창묶음(page);
  let 주문번호 = '';

  try {
    await test.step('일회용 회원으로 로그인해 주문을 만들고 한 번 취소해 둔다', async () => {
      await 요청로그인한일회용회원(request);
      await verify('일회용 회원으로 로그인해 있다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
      const 줄번호 = await 장바구니담기(request, { productId: (await 옵션없는상품(request)).id, qty: 1 });
      const 응답 = await 주문요청(request, { cartItemIds: [줄번호] });
      await verify('주문 응답 코드가 201이다', 응답.status(), 201, { blocker: true });
      주문번호 = ((await 응답.json()) as { id: string }).id;
      const 취소 = await 주문취소요청(request, 주문번호);
      await verify('첫 취소 응답 코드가 200이다', 취소.status(), 200, { blocker: true });
    });

    await test.step('이미 취소한 주문으로 POST /api/orders/{id}/cancel 을 다시 부른다', async () => {
      const 응답 = await 주문취소요청(request, 주문번호);
      await verify('결제완료가 아닌 주문을 취소하면 409 로 응답한다', 응답.status(), 409);
    });

    await test.step('로그인 없이 POST /api/orders/{id}/cancel 을 부른다', async () => {
      const 응답 = await 주문취소요청(손님.request, 주문번호);
      await verify('로그인 없이 주문 취소 API 를 부르면 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    await 손님.close();
    await 장바구니비우기(request);
  }
});

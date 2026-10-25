import { defineCase, test, verify } from '@platform/kit';

import { 장바구니담기, 장바구니비우기, 옵션없는상품 } from './helpers/data.helper.js';
import { 요청로그인한일회용회원, 주문요청, 주문취소요청 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-377',
  name: '주문 API 를 부르면 201 과 주문번호로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 줄번호 = 0;
  let 주문번호 = '';

  try {
    await test.step('일회용 회원으로 로그인해 장바구니에 상품을 담는다', async () => {
      await 요청로그인한일회용회원(request);
      await verify('일회용 회원으로 로그인해 있다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
      줄번호 = await 장바구니담기(request, { productId: (await 옵션없는상품(request)).id, qty: 1 });
    });

    await test.step('장바구니 줄로 POST /api/orders 를 부른다', async () => {
      const 응답 = await 주문요청(request, { cartItemIds: [줄번호] });
      const 코드 = await verify('응답 코드가 201이다', 응답.status(), 201);
      const 몸 = (await 응답.json()) as { id?: string };
      주문번호 = 몸.id ?? '';
      const 번호 = await verify('주문번호가 온다', 주문번호.length > 0, true);
      await verify('주문 API 를 부르면 201 과 주문번호로 응답한다', 코드 && 번호, true);
    });
  } finally {
    if (주문번호 !== '') await 주문취소요청(request, 주문번호);
    await 장바구니비우기(request);
  }
});

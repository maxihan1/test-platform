import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-255',
  name: '비회원이 장바구니 조회를 부르면 401 로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 GET /api/cart 를 부른다', async () => {
    const res = await request.get('/api/cart');
    await verify('비회원이 장바구니 조회를 부르면 401 로 응답한다', res.status(), 401);
  });

  await test.step('비회원으로 POST /api/cart 를 부른다', async () => {
    const res = await request.post('/api/cart', { data: { productId: 34, qty: 1, color: '', size: '' } });
    await verify('비회원이 장바구니 담기를 부르면 401 로 응답한다', res.status(), 401);
  });

  await test.step('비회원으로 PATCH /api/cart/1 을 부른다', async () => {
    const res = await request.patch('/api/cart/1', { data: { qty: 2 } });
    await verify('비회원이 장바구니 수량 변경을 부르면 401 로 응답한다', res.status(), 401);
  });

  await test.step('비회원으로 DELETE /api/cart/1 을 부른다', async () => {
    const res = await request.delete('/api/cart/1');
    await verify('비회원이 장바구니 삭제를 부르면 401 로 응답한다', res.status(), 401);
  });
});

import { defineCase, test, verify } from '@platform/kit';

import { 새창묶음 } from './helpers/common-tools.helper.js';
import { 상품목록, 상품읽기 } from './helpers/data.helper.js';
import { 요청로그인한일회용회원, 주문요청 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-378',
  name: '로그인 없이 주문 API 를 부르면 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  const 손님 = await 새창묶음(page);

  try {
    await test.step('로그인 없이 POST /api/orders 를 부른다', async () => {
      const 보기 = (await (await 손님.request.get('/api/session')).json()) as { user: unknown };
      await verify('이 요청은 로그인하지 않았다', 보기.user, null, { blocker: true });
      const 응답 = await 손님.request.post('/api/orders', { data: { cartItemIds: [1] } });
      await verify('로그인 없이 주문 API 를 부르면 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('일회용 회원으로 로그인해 재고가 가장 적은 옵션 없는 상품을 찾는다', async () => {
      await 요청로그인한일회용회원(request);
      await verify('일회용 회원으로 로그인해 있다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
    });

    await test.step('재고보다 많은 수량으로 POST /api/orders 를 부른다', async () => {
      const 후보 = (await 상품목록(request)).filter((하나) => !하나.soldOut && 하나.stock > 0).sort((앞, 뒤) => 앞.stock - 뒤.stock);
      let 재고 = 0;
      let 상품번호 = 0;
      for (const 하나 of 후보) {
        const 상세 = await 상품읽기(request, 하나.id);
        if (상세.colors.length === 0 && 상세.sizes.length === 0) {
          재고 = 상세.stock;
          상품번호 = 상세.id;
          break;
        }
      }
      const 응답 = await 주문요청(request, { direct: { productId: 상품번호, color: '', size: '', qty: 재고 + 1 } });
      await verify('재고보다 많이 주문하면 주문 API 가 409 로 응답한다', 응답.status(), 409);
    });
  } finally {
    await 손님.close();
  }
});

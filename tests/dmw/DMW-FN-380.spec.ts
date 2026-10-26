import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새창묶음 } from './helpers/common-tools.helper.js';
import { 장바구니담기, 장바구니비우기, 옵션없는상품 } from './helpers/data.helper.js';
import { 요청로그인한일회용회원, 주문요청, 주문취소요청 } from './helpers/board-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-380',
  name: '다른 회원의 주문 상세를 부르면 403 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다', '비회원이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request, params }) => {
  const 손님 = await 새창묶음(page);
  let 주문번호 = '';

  try {
    await test.step('다른 일회용 회원의 주문을 만들어 두고 회원으로 로그인한다', async () => {
      await 요청로그인한일회용회원(request);
      const 줄번호 = await 장바구니담기(request, { productId: (await 옵션없는상품(request)).id, qty: 1 });
      const 응답 = await 주문요청(request, { cartItemIds: [줄번호] });
      await verify('다른 회원의 주문 응답 코드가 201이다', 응답.status(), 201, { blocker: true });
      주문번호 = ((await 응답.json()) as { id: string }).id;
      await 계정으로로그인(page, params.loginId, params.loginPassword);
      await verify('회원으로 로그인해 있다', ((await (await page.request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
    });

    await test.step('다른 회원의 주문 번호로 GET /api/orders/{id} 를 부른다', async () => {
      const 응답 = await page.request.get(`/api/orders/${encodeURIComponent(주문번호)}`);
      await verify('다른 회원의 주문 상세를 부르면 403 으로 응답한다', 응답.status(), 403);
    });

    await test.step('로그인 없이 GET /api/orders 를 부른다', async () => {
      const 응답 = await 손님.request.get('/api/orders');
      await verify('로그인 없이 주문 목록 API 를 부르면 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    await 손님.close();
    if (주문번호 !== '') await 주문취소요청(request, 주문번호);
    await 장바구니비우기(request);
  }
});

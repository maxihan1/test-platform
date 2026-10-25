import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니, 장바구니담기, 장바구니비우기, 옵션없는상품 } from './helpers/data.helper.js';
import { 요청로그인한일회용회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-375',
  name: '장바구니 담기 API 로 담으면 장바구니 조회에 그 줄이 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    바꿀수량: z.number().int().describe('장바구니 줄의 바꿀 수량 — 1 이상 10 이하').default(3),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 줄번호 = 0;
  let 상품번호 = 0;

  try {
    await test.step('일회용 회원으로 로그인한다', async () => {
      await 요청로그인한일회용회원(request);
      상품번호 = (await 옵션없는상품(request)).id;
      await verify('일회용 회원으로 로그인해 있다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
    });

    await test.step('POST /api/cart 로 상품을 담고 GET /api/cart 로 조회한다', async () => {
      줄번호 = await 장바구니담기(request, { productId: 상품번호, qty: 1 });
      const 줄들 = await 장바구니(request);
      await verify('장바구니 담기 API 로 담으면 장바구니 조회에 그 줄이 있다', 줄들.map((줄) => 줄.productId), [상품번호]);
    });

    await test.step('PATCH /api/cart/{itemId} 로 수량을 3으로 바꾼다', async () => {
      const 응답 = await request.patch(`/api/cart/${줄번호}`, { data: { qty: params.바꿀수량 } });
      await verify('수량 변경 응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 줄 = (await 장바구니(request)).find((하나) => 하나.id === 줄번호);
      await verify('장바구니 수량 변경 API 를 부르면 그 줄 수량이 3이 된다', 줄?.qty, params.바꿀수량);
    });

    await test.step('DELETE /api/cart/{itemId} 로 줄을 지운다', async () => {
      const 응답 = await request.delete(`/api/cart/${줄번호}`);
      await verify('줄 삭제 응답 코드가 성공이다', 응답.ok(), true, { blocker: true });
      await verify('장바구니 삭제 API 를 부르면 그 줄이 장바구니에서 빠진다', (await 장바구니(request)).filter((하나) => 하나.id === 줄번호).length, 0);
    });
  } finally {
    await 장바구니비우기(request);
  }
});

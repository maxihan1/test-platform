import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니비우기, 장바구니조회, 상품번호 } from './components/data.component.js';
import { 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-469',
  name: '빈 장바구니 조회는 「items」가 빈 목록으로 온다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니가 비어 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 정리 = new 정리함();
  try {
    let 줄번호 = 0;

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(request, 정리);
      정리.더하기(() => 장바구니비우기(request));
    });

    await test.step('장바구니 조회 GET /api/cart 를 부른다', async () => {
      const res = await request.get('/api/cart');
      await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
      await verify('빈 장바구니 조회는 「items」가 빈 목록으로 온다', ((await res.json()) as { items: unknown[] }).items, []);
    });

    await test.step('상품 하나를 POST /api/cart 로 담는다', async () => {
      const res = await request.post('/api/cart', { data: { productId: 상품번호.USB허브, color: '', size: '', qty: 1 } });
      await verify('담기 요청은 201 로 응답한다', res.status(), 201, { blocker: true });
      const 줄들 = await 장바구니조회(request);
      줄번호 = 줄들[0]?.id ?? 0;
      await verify('장바구니 담기 뒤 조회하면 그 상품이 한 줄 보인다', 줄들.map((줄) => 줄.productId), [상품번호.USB허브]);
    });

    await test.step('그 줄의 수량을 PATCH /api/cart/{itemId} 로 3으로 바꾼다', async () => {
      await request.patch(`/api/cart/${줄번호}`, { data: { qty: 3 } });
      await verify('수량 변경 뒤 조회하면 그 줄 수량이 3이다', (await 장바구니조회(request)).map((줄) => 줄.qty), [3]);
    });

    await test.step('그 줄을 DELETE /api/cart/{itemId} 로 지운다', async () => {
      await request.delete(`/api/cart/${줄번호}`);
      await verify('장바구니 삭제 뒤 조회하면 그 줄이 없다', await 장바구니조회(request), []);
    });
  } finally {
    await 정리.비우기();
  }
});

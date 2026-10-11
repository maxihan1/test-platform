import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 옵션없는상품 } from './helpers/shop-tools.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-313',
  name: 'POST /api/cart 로 담으면 GET /api/cart 에 그 상품 줄이 돌아온다',
  precondition: ['새로 가입한 회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  try {
    await test.step('새 회원으로 로그인한다', async () => {
      await 새회원으로로그인(request);
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(request)) !== null, true, { blocker: true });
    });

    let 줄번호 = 0;

    await test.step('POST /api/cart 로 상품을 담고 GET /api/cart 를 부른다', async () => {
      const 상품 = await 옵션없는상품(request);
      const 담기 = await request.post('/api/cart', { data: { productId: 상품.id, qty: 1 } });
      await verify('POST /api/cart 응답 코드가 성공이다', 담기.ok(), true, { blocker: true });
      줄번호 = ((await 담기.json()) as { id: number }).id;
      await verify('POST /api/cart 로 담으면 GET /api/cart 에 그 상품 줄이 돌아온다', (await 장바구니보기(request)).some((줄) => 줄.id === 줄번호 && 줄.productId === 상품.id), true);
    });

    await test.step('담은 줄을 PATCH /api/cart/{itemId} 로 수량 3으로 바꾼다', async () => {
      const 바꿈 = await request.patch(`/api/cart/${String(줄번호)}`, { data: { qty: 3 } });
      await verify('PATCH /api/cart/{itemId} 응답 코드가 성공이다', 바꿈.ok(), true, { blocker: true });
      await verify('PATCH /api/cart/{itemId} 로 수량을 바꾸면 GET /api/cart 의 수량이 3이다', (await 장바구니보기(request)).find((줄) => 줄.id === 줄번호)?.qty, 3);
    });

    await test.step('담은 줄을 DELETE /api/cart/{itemId} 로 지운다', async () => {
      const 지움 = await request.delete(`/api/cart/${String(줄번호)}`);
      await verify('DELETE /api/cart/{itemId} 응답 코드가 성공이다', 지움.ok(), true, { blocker: true });
      await verify('DELETE /api/cart/{itemId} 를 부르면 GET /api/cart 에서 그 줄이 사라진다', (await 장바구니보기(request)).some((줄) => 줄.id === 줄번호), false);
    });
  } finally {
    await 탈퇴(request);
  }
});

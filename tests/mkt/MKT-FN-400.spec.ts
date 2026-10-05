import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원, 아이디사용중인가 } from './components/account.component.js';
import { 장바구니비우기, 상품번호 } from './components/data.component.js';
import { 있어야한다 } from './components/site-extra.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-400',
  name: '조회 요청은 200 과 JSON 본문으로 응답한다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원 계정이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  let 회원 = undefined as 임시회원 | undefined;
  let 줄번호 = undefined as number | undefined;

  try {
    await test.step('새로 만든 회원을 가입시키고 로그인한다', async () => {
      회원 = await 임시회원로그인(request);
    });

    await test.step('새로 만든 회원 계정이 있는지 확인한다', async () => {
      await verify('새로 만든 회원 계정이 있다', await 아이디사용중인가(request, 있어야한다(회원, '새로 만든 회원').loginId), true, { blocker: true });
    });

    await test.step('상품 목록을 GET 으로 부른다', async () => {
      const 응답 = await request.get('/api/products');
      const 본문 = await 응답.json().catch(() => undefined);
      await verify(
        '조회 요청은 200 과 JSON 본문으로 응답한다',
        [응답.status(), (응답.headers()['content-type'] ?? '').includes('application/json'), 본문 !== undefined],
        [200, true, true],
      );
    });

    await test.step('그 회원으로 장바구니에 상품을 담는 POST 를 보낸다', async () => {
      const 응답 = await request.post('/api/cart', { data: { productId: 상품번호.USB허브, color: '', size: '', qty: 1 } });
      줄번호 = ((await 응답.json()) as { id: number }).id;
      await verify('생성 요청은 201 로 응답한다', 응답.status(), 201);
    });

    await test.step('담은 장바구니 줄의 수량을 PATCH 로 바꾼다', async () => {
      const 응답 = await request.patch(`/api/cart/${있어야한다(줄번호, '담은 장바구니 줄')}`, { data: { qty: 2 } });
      await verify('수정 요청은 200 으로 응답한다', 응답.status(), 200);
    });

    await test.step('담은 장바구니 줄을 DELETE 로 지운다', async () => {
      const 응답 = await request.delete(`/api/cart/${있어야한다(줄번호, '담은 장바구니 줄')}`);
      await verify('삭제 요청은 204 와 빈 본문으로 응답한다', [응답.status(), (await 응답.text()).length], [204, 0]);
    });
  } finally {
    if (회원) {
      await 장바구니비우기(request);
      await 임시회원지우기(request, 회원);
    }
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 둘째아이디 } from './helpers/account.helper.js';
import { 옵션없는상품번호 } from './helpers/shop.helper.js';
import { 바로주문, 주문취소 } from './helpers/order.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-145',
  name: '주문을 요청하면 201 과 주문번호가 온다',
  platforms: ['desktop'],
  precondition: ['두 번째 회원으로 로그인해 있다'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 주문번호: string | undefined;

  try {
    await test.step('두 번째 회원으로 로그인한다', async () => {
      await verify('로그인 응답 코드가 200이다', await API로그인(request, 둘째아이디, params.password ?? ''), 200, { blocker: true });
    });

    await test.step('주문 API 를 요청한다', async () => {
      const 주문 = await 바로주문(request, { productId: 옵션없는상품번호, qty: 1 });
      주문번호 = 주문.id;
      await verify(
        '주문을 요청하면 201 과 주문번호가 온다',
        { 코드: 주문.status, 주문번호있음: typeof 주문.id === 'string' && 주문.id !== '' },
        { 코드: 201, 주문번호있음: true },
      );
    });

    await test.step('방금 만든 결제완료 주문의 취소 API 를 요청한다', async () => {
      const 만든주문 = await request.get(`/api/orders/${주문번호 ?? ''}`);
      await verify('방금 만든 주문 상태가 「결제완료」 이다', ((await 만든주문.json()) as { status?: string }).status, '결제완료', { blocker: true });
      await 주문취소(request, 주문번호 ?? '');
      const 취소뒤 = await request.get(`/api/orders/${주문번호 ?? ''}`);
      await verify('결제완료 주문의 취소를 요청하면 그 주문 상태가 「주문취소」 가 된다', ((await 취소뒤.json()) as { status?: string }).status, '주문취소');
    });
  } finally {
    if (주문번호 !== undefined) await 주문취소(request, 주문번호);
  }
});

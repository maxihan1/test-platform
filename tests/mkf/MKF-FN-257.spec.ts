import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인, 계정값 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';
import { 배송중주문번호 } from './helpers/my-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-257',
  name: '비회원이 주문 취소를 부르면 401 로 응답한다',
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 취소본문 = { reason: '단순 변심', detail: '' };

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('비회원으로 POST /api/orders/{id}/cancel 을 부른다', async () => {
      const res = await request.post('/api/orders/DM20261002-0002/cancel', { data: 취소본문 });
      await verify('비회원이 주문 취소를 부르면 401 로 응답한다', res.status(), 401);
    });

    await test.step('테스트 계정으로 로그인한다', async () => {
      const 계정 = 계정값(params);
      await API로그인(request, 계정.loginId, 계정.password);
    });

    await test.step('회원으로 로그인해 있는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 요청세션아이디(request), 계정값(params).loginId, { blocker: true });
    });

    await test.step('배송중 주문으로 POST /api/orders/{id}/cancel 을 부른다', async () => {
      const 주문번호 = await 배송중주문번호(request);
      const res = await request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: 취소본문 });
      await verify('결제완료가 아닌 주문을 취소하면 409 로 응답한다', res.status(), 409);
    });
  } finally {
    await API로그아웃(request);
  }
});

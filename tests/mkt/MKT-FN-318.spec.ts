import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, API로그아웃, 내정보 } from './helpers/account.helper.js';
import { 주문만들기, 둘째회원만들기, 둘째회원정리 } from './helpers/order-tools.helper.js';
import type { 둘째회원 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-318',
  name: '다른 회원 주문 상세를 부르면 403 으로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['회원으로 로그인한 요청이다', '로그인하지 않은 요청이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 둘째!: 둘째회원;
  let 둘째주문번호 = '';
  const 계정 = 계정값(params);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await API로그인(request, 계정.loginId, 계정.password);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원 세션이 있다', (await 내정보(request)).loginId === 계정.loginId, true, { blocker: true });
    });

    await test.step('다른 회원이 주문을 하나 만든다', async () => {
      둘째 = await 둘째회원만들기();
      둘째주문번호 = (await 주문만들기(둘째.api)).주문번호;
    });

    await test.step('다른 회원의 주문이 있는지 확인한다', async () => {
      await verify('다른 회원의 주문이 하나 있다', (await 둘째.api.get('/api/orders/' + encodeURIComponent(둘째주문번호))).ok(), true, { blocker: true });
    });

    await test.step('다른 회원의 주문 번호로 GET /api/orders/{id} 를 부른다', async () => {
      const 응답 = await request.get('/api/orders/' + encodeURIComponent(둘째주문번호));
      await verify('다른 회원 주문 상세를 부르면 403 으로 응답한다', 응답.status(), 403);
    });

    await test.step('로그아웃해 로그인하지 않은 요청으로 만든다', async () => {
      await API로그아웃(request);
    });

    await test.step('로그아웃한 요청인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
    });

    await test.step('GET /api/orders?period=all 을 부른다', async () => {
      const 응답 = await request.get('/api/orders', { params: { period: 'all' } });
      await verify('로그인 없이 GET /api/orders 를 부르면 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    await 둘째회원정리(둘째, 둘째주문번호 === '' ? [] : [둘째주문번호]);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-439',
  name: '일반 회원이 주문 CSV 요청을 하면 403 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      준비.회원 = await 새회원으로로그인(request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(request), true, { blocker: true });
    });

    await test.step('일반 회원으로 GET /api/admin/orders.csv 를 부른다', async () => {
      const 응답 = await request.get('/api/admin/orders.csv');
      await verify('일반 회원이 주문 CSV 요청을 하면 403 으로 응답한다', 응답.status(), 403);
    });
  } finally {
    await 회원과주문정리(request, 준비.회원);
  }
});

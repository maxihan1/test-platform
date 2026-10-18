import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-407',
  name: '보유 쿠폰 목록 요청은 쿠폰 두 장을 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
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

    await test.step('GET /api/coupons 를 부른다', async () => {
      const 응답 = await request.get('/api/coupons');
      await verify('보유 쿠폰 목록 요청은 쿠폰 두 장을 준다', ((await 응답.json()) as { items: unknown[] }).items.length, 2);
    });
  } finally {
    await 회원과주문정리(request, 준비.회원);
  }
});

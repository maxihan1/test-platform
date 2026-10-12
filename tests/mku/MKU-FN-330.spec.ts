import { defineCase, test, verify } from '@platform/kit';

import { API로그인, API로그아웃, 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 재고초과요청본문, 주문요청본문 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-330',
  name: '재고보다 많이 주문하면 409 로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['새로 가입한 회원이 장바구니에 상품을 담았다', '로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 정보!: 회원정보;

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      정보 = await 새회원으로로그인(request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('재고보다 많은 수량으로 POST /api/orders 를 보낸다', async () => {
      const 응답 = await request.post('/api/orders', { data: await 재고초과요청본문(request) });
      await verify('재고보다 많이 주문하면 409 로 응답한다', 응답.status(), 409);
    });

    await test.step('로그아웃해 로그인하지 않은 요청으로 만든다', async () => {
      await API로그아웃(request);
    });

    await test.step('로그아웃한 요청인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
    });

    await test.step('로그인 없이 POST /api/orders 를 보낸다', async () => {
      const 응답 = await request.post('/api/orders', { data: 주문요청본문({ cartItemIds: [1] }) });
      await verify('로그인 없이 POST /api/orders 를 보내면 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    await API로그인(request, 정보.loginId, 정보.password);
    await 탈퇴(request);
  }
});

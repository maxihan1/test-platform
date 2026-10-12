import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';
import { 재고초과요청본문, 주문요청본문 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-256',
  name: '비회원이 주문을 부르면 401 로 응답한다',
  precondition: ['비회원이다', '새로 가입한 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  let 정보!: 회원정보;

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('비회원으로 POST /api/orders 를 부른다', async () => {
      const res = await request.post('/api/orders', { data: 주문요청본문({ cartItemIds: [1] }) });
      await verify('비회원이 주문을 부르면 401 로 응답한다', res.status(), 401);
    });

    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('새로 가입한 회원으로 로그인해 있는지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', await 요청세션아이디(page.request), 정보.loginId, { blocker: true });
    });

    await test.step('재고보다 많은 수량으로 POST /api/orders 를 부른다', async () => {
      const res = await page.request.post('/api/orders', { data: await 재고초과요청본문(page.request) });
      await verify('재고보다 많이 주문하면 409 로 응답한다', res.status(), 409);
    });
  } finally {
    await 탈퇴(page.request);
  }
});

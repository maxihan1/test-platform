import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';
import { 주문만들기, 둘째회원만들기, 둘째회원정리 } from './helpers/order-tools.helper.js';
import type { 둘째회원 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-285',
  name: '남의 주문 상세를 부르면 403 으로 응답한다',
  precondition: ['새로 가입한 회원으로 로그인해 있다', '비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  let 주인: 둘째회원 | undefined;
  let 주문번호 = '';
  let 로그인함 = false;
  let 새로운회원!: 회원정보;

  try {
    await test.step('다른 회원이 가입해 주문을 하나 만들고 새 회원으로 로그인한다', async () => {
      주인 = await 둘째회원만들기();
      주문번호 = (await 주문만들기(주인.api)).주문번호;
      로그인함 = true;
      새로운회원 = await 새회원으로로그인(page.request);
    });

    await test.step('새로 가입한 회원으로 로그인해 있고 비회원인 요청이 있는지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', await 요청세션아이디(page.request), 새로운회원.loginId, { blocker: true });
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('다른 회원의 주문으로 GET /api/orders/{id} 를 부른다', async () => {
      const res = await page.request.get(`/api/orders/${encodeURIComponent(주문번호)}`);
      await verify('남의 주문 상세를 부르면 403 으로 응답한다', res.status(), 403);
    });

    await test.step('비회원으로 GET /api/orders 를 부른다', async () => {
      const res = await request.get('/api/orders');
      await verify('비회원이 주문 목록을 부르면 401 로 응답한다', res.status(), 401);
    });
  } finally {
    if (로그인함) await 탈퇴(page.request);
    await 둘째회원정리(주인, 주문번호 === '' ? [] : [주문번호]);
  }
});

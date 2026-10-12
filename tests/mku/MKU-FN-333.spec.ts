import { defineCase, test, verify } from '@platform/kit';

import { 탈퇴 } from './helpers/account.helper.js';
import { 둘째회원만들기, 둘째회원정리, 임시회원과주문 } from './helpers/order-tools.helper.js';
import type { 둘째회원 } from './helpers/order-tools.helper.js';
import { 주문취소 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-333',
  name: '다른 회원 주문 상세를 부르면 403 으로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['두 회원이 있고 한 회원이 주문을 했다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 둘째: 둘째회원 | undefined;
  let 주문번호 = '';

  try {
    await test.step('첫째 회원이 가입해 주문을 하나 만든다', async () => {
      주문번호 = (await 임시회원과주문(request)).주문번호;
    });

    await test.step('첫째 회원이 자기 주문을 볼 수 있는지 확인한다', async () => {
      await verify('첫째 회원은 자기 주문 상세를 볼 수 있다', (await request.get('/api/orders/' + encodeURIComponent(주문번호))).ok(), true, { blocker: true });
    });

    await test.step('둘째 회원이 가입해 로그인한다', async () => {
      둘째 = await 둘째회원만들기();
    });

    await test.step('둘째 회원이 로그인했는지 확인한다', async () => {
      await verify('둘째 회원은 자기 주문 목록을 볼 수 있다', (await 둘째?.api.get('/api/orders?period=all'))?.ok(), true, { blocker: true });
    });

    await test.step('다른 회원으로 그 주문 GET /api/orders/{id} 를 부른다', async () => {
      const 응답 = await 둘째?.api.get('/api/orders/' + encodeURIComponent(주문번호));
      await verify('다른 회원 주문 상세를 부르면 403 으로 응답한다', 응답?.status(), 403);
    });
  } finally {
    await 둘째회원정리(둘째, []);
    if (주문번호 !== '') await 주문취소(request, 주문번호);
    await 탈퇴(request);
  }
});

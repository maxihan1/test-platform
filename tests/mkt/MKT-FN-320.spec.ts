import { defineCase, test, verify } from '@platform/kit';

import { API로그인, API로그아웃, 탈퇴 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 임시회원과주문 } from './helpers/order-tools.helper.js';
import { 주문취소 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-320',
  name: '결제완료가 아닌 주문을 취소하면 409 로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['새로 가입한 회원으로 로그인한 요청이다', '로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 정보!: 회원정보;
  let 주문번호 = '';

  try {
    await test.step('임시 회원으로 가입해 결제완료 주문을 만든다', async () => {
      const 만든 = await 임시회원과주문(request);
      정보 = 만든.정보;
      주문번호 = 만든.주문번호;
    });

    await test.step('결제완료 주문이 있는지 확인한다', async () => {
      await verify('결제완료 주문이 하나 있다', ((await (await request.get('/api/orders/' + encodeURIComponent(주문번호))).json()) as { status: string }).status, '결제완료', { blocker: true });
    });

    await test.step('취소한 주문에 POST /api/orders/{id}/cancel 을 한 번 더 보낸다', async () => {
      await 주문취소(request, 주문번호);
      const 응답 = await request.post('/api/orders/' + encodeURIComponent(주문번호) + '/cancel', { data: { reason: '단순 변심', detail: '' } });
      await verify('결제완료가 아닌 주문을 취소하면 409 로 응답한다', 응답.status(), 409);
    });

    await test.step('로그아웃해 로그인하지 않은 요청으로 만든다', async () => {
      await API로그아웃(request);
    });

    await test.step('로그아웃한 요청인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
    });

    await test.step('POST /api/orders/{id}/cancel 을 보낸다', async () => {
      const 응답 = await request.post('/api/orders/' + encodeURIComponent(주문번호) + '/cancel', { data: { reason: '단순 변심', detail: '' } });
      await verify('로그인 없이 주문 취소를 보내면 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    await API로그인(request, 정보.loginId, 정보.password);
    if (주문번호 !== '') await 주문취소(request, 주문번호);
    await 탈퇴(request);
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 주문만들기 } from './helpers/order-tools.helper.js';
import { 주문취소 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-317',
  name: 'GET /api/orders?period=all 은 내 주문을 돌려준다',
  precondition: ['새로 가입한 회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 만든주문: string[] = [];
  let 주문번호 = '';
  let 정보!: 회원정보;

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      정보 = await 새회원으로로그인(request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('주문을 하나 만든 뒤 GET /api/orders?period=all 을 부른다', async () => {
      주문번호 = (await 주문만들기(request)).주문번호;
      만든주문.push(주문번호);
      const 응답 = await request.get('/api/orders', { params: { period: 'all' } });
      const 본문 = (await 응답.json()) as { items: { id: string }[] };
      await verify('GET /api/orders?period=all 은 내 주문을 돌려준다', 본문.items.some((줄) => 줄.id === 주문번호), true);
    });

    await test.step('주문을 하나 만든 뒤 GET /api/orders/{id} 를 부른다', async () => {
      주문번호 = (await 주문만들기(request)).주문번호;
      만든주문.push(주문번호);
      const 응답 = await request.get('/api/orders/' + encodeURIComponent(주문번호));
      const 본문 = (await 응답.json()) as { id?: string };
      await verify('GET /api/orders/{id} 는 내 주문 상세를 돌려준다', 본문.id === 주문번호, true);
    });
  } finally {
    for (const 번호 of 만든주문) await 주문취소(request, 번호);
    await 탈퇴(request);
  }
});

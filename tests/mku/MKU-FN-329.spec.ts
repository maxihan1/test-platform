import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 상품담기, 주문요청본문 } from './helpers/order-tools.helper.js';
import { 주문취소 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-329',
  name: 'POST /api/orders 로 주문하면 「DM」으로 시작하는 주문번호가 돌아온다',
  precondition: ['새로 가입한 회원이 장바구니에 상품을 담았다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 만든주문: string[] = [];
  let 정보!: 회원정보;

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      정보 = await 새회원으로로그인(request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('POST /api/orders 로 주문한다', async () => {
      const 담음 = await 상품담기(request);
      const 응답 = await request.post('/api/orders', { data: 주문요청본문({ cartItemIds: [담음.줄번호] }) });
      const 본문 = (await 응답.json()) as { id?: string };
      만든주문 = 본문.id === undefined ? [] : [본문.id];
      await verify('POST /api/orders 로 주문하면 「DM」으로 시작하는 주문번호가 돌아온다', (본문.id ?? '').startsWith('DM'), true);
    });
  } finally {
    for (const 번호 of 만든주문) await 주문취소(request, 번호);
    await 탈퇴(request);
  }
});

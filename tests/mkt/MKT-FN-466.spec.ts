import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-466',
  name: '보유 쿠폰으로 「10% 할인 (최대 5,000원)」 · 「3,000원 할인 (30,000원 이상 구매 시)」 두 장이 온다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 정리 = new 정리함();
  try {
    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(request, 정리);
    });

    await test.step('보유 쿠폰 목록 /api/coupons 를 부른다', async () => {
      const res = await request.get('/api/coupons');
      await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
      const { items } = (await res.json()) as { items: Array<{ label: string }> };
      await verify(
        '보유 쿠폰으로 「10% 할인 (최대 5,000원)」 · 「3,000원 할인 (30,000원 이상 구매 시)」 두 장이 온다',
        items.map((쿠폰) => 쿠폰.label),
        ['10% 할인 (최대 5,000원)', '3,000원 할인 (30,000원 이상 구매 시)'],
      );
    });
  } finally {
    await 정리.비우기();
  }
});

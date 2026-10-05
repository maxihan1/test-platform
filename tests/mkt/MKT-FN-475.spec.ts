import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 테스트계정값 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-475',
  name: 'period=all 로 부르면 테스트 계정 주문 3건이 온다',
  precondition: ['테스트 계정 회원으로 로그인해 있다', '테스트 계정은 주문 3건을 가지고 있다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ request, params }) => {
  let 첫주문번호 = '';

  await test.step('테스트 계정 회원으로 로그인한다', async () => {
    const 계정 = 테스트계정값(params);
    await API로그인(request, 계정.loginId, 계정.password);
  });

  await test.step('내 주문 목록을 period=all 로 부른다', async () => {
    const res = await request.get('/api/orders', { params: { period: 'all' } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: Array<{ id: string }> };
    첫주문번호 = items[0]?.id ?? '';
    await verify('period=all 로 부르면 테스트 계정 주문 3건이 온다', items.length, 3);
  });

  await test.step('첫 주문의 상세를 부른다', async () => {
    const res = await request.get(`/api/orders/${encodeURIComponent(첫주문번호)}`);
    await verify('내 주문 상세 조회는 200 으로 응답한다', res.status(), 200);
  });
});

// 시나리오 실측용 가짜 케이스 — 받은 아이디로 로그인해 주문한다. 아이디는 앞 단계 가입 응답에서 값 주입으로 받는다 (apps/runner/scenario/push-e2e.test.ts)

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'XSF-010',
  name: '로그인해 주문한다',
  precondition: [],
  params: z.object({ 아이디: z.string().default(''), 비밀번호: z.string().default('') }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('로그인한다', async () => {
    const 응답 = await request.post('/api/auth/login', { data: { loginId: params.아이디, password: params.비밀번호 } });
    await verify('로그인이 된다', 응답.status(), 200, { blocker: true });
  });

  await test.step('주문한다', async () => {
    const 응답 = await request.post('/api/orders', { data: { cartItemIds: [1] } });
    await verify('주문이 된다', 응답.status(), 201);
  });
});

// 시나리오 실측용 가짜 케이스 — 쇼핑몰에 새 회원으로 가입한다. 아이디는 돌 때마다 새로 만들어 뒤 단계가 응답에서 꺼내 쓴다 (apps/runner/scenario/push-e2e.test.ts)

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'XSF-009',
  name: '새 회원으로 가입한다',
  precondition: [],
  params: z.object({ 비밀번호: z.string().default('Passw0rd!') }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('가입한다', async () => {
    const 응답 = await request.post('/api/auth/signup', { data: { loginId: `qa_${Date.now().toString(36)}`, password: params.비밀번호, name: '시험' } });
    await verify('가입이 된다', 응답.status(), 201);
  });
});

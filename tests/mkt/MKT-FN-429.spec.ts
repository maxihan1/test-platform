import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-429',
  name: '비회원이 현재 회원 조회를 부르면 401 로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('로그인 없이 현재 회원 조회 /api/auth/me 를 부른다', async () => {
    const 응답 = await request.get('/api/auth/me');
    await verify('비회원이 현재 회원 조회를 부르면 401 로 응답한다', 응답.status(), 401);
  });
});

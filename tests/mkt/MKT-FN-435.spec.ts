import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-435',
  name: '비회원이 세션을 부르면 401 이 아니라 200 과 「user」: null 로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('로그인 없이 세션 조회 /api/session 을 부른다', async () => {
    const 응답 = await request.get('/api/session');
    const 본문 = (await 응답.json()) as { user: unknown };
    await verify(
      '비회원이 세션을 부르면 401 이 아니라 200 과 「user」: null 로 응답한다',
      { 상태: 응답.status(), user: 본문.user },
      { 상태: 200, user: null },
    );
  });
});

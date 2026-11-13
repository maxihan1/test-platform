import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-348',
  name: 'GET /Authentication 을 부르면 500 이다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(500),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /Authentication 을 부른다', async () => {
    const 응답 = await request.get('/Authentication', { maxRedirects: 0 });
    await verify('GET /Authentication 을 부르면 500 이다', 응답.status(), expected.응답코드);
  });
});

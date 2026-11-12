import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-361',
  name: 'GET /api/v1/instance 를 토큰 없이 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/instance 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get(`/api/v1/instance`);
    await verify('GET /api/v1/instance 를 토큰 없이 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});

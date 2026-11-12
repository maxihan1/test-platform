import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-696',
  name: 'GET /api/v1/streaming/health 를 부르면 본문이 OK 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    본문: z.string().describe('응답 본문').default('OK'),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/streaming/health 의 본문을 읽는다', async () => {
    const 응답 = await request.get('/api/v1/streaming/health');
    await verify('GET /api/v1/streaming/health 를 부르면 본문이 OK 다', await 응답.text(), expected.본문);
  });
});

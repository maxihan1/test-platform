import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-532',
  name: 'GET /api/v2/instance 를 부르면 Content-Type 이 application/json 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    형식: z.string().describe('응답 형식').default('application/json'),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 를 부른다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    await verify('GET /api/v2/instance 를 부르면 Content-Type 이 application/json 이다', (응답.headers()['content-type'] ?? '').includes(expected.형식), true);
  });
});

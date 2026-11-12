import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-537',
  name: 'GET /api/v1/instance.json 을 부르면 응답 코드가 200 이 아니다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    성공코드: z.number().describe('성공 응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/instance.json 을 부른다', async () => {
    const 응답 = await request.get('/api/v1/instance.json');
    await verify('GET /api/v1/instance.json 을 부르면 응답 코드가 200 이 아니다', 응답.status() !== expected.성공코드, true);
  });
});

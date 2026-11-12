import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-105',
  name: 'GET /api/v1/follow_requests 를 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다'],
  params: null,
  expected: z.object({
    토큰없음응답코드: z.number().describe('토큰 없이 부를 때 응답 코드').default(401),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/follow_requests 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get(`/api/v1/follow_requests`);
    await verify('GET /api/v1/follow_requests 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
  });
});

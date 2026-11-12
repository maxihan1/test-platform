import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-697',
  name: '토큰 없이 공개 스트림을 열면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('토큰 없이 GET /api/v1/streaming/public 을 연다', async () => {
    const 응답 = await request.get('/api/v1/streaming/public');
    await verify('토큰 없이 공개 스트림을 열면 응답 코드가 401 이다', 응답.status(), expected.응답코드);
  });
});

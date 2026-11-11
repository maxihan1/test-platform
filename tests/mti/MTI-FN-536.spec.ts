import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-536',
  name: '공개 타임라인을 부르면 응답 머리의 Vary 에 Authorization 이 있다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    머리이름: z.string().describe('Vary 에 있어야 하는 머리').default('Authorization'),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/timelines/public 의 응답 머리를 읽는다', async () => {
    const 응답 = await request.get('/api/v1/timelines/public');
    await verify('공개 타임라인을 부르면 응답 머리의 Vary 에 Authorization 이 있다', (응답.headers()['vary'] ?? '').includes(expected.머리이름), true);
  });
});

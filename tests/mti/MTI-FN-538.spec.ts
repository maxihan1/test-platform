import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-538',
  name: 'GET /api/v1/timelines/public?limit=1 을 부르면 Link 헤더에 rel="next" 가 있다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    다음쪽링크있음: z.boolean().describe('다음 쪽 링크가 있는지').default(true),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/timelines/public?limit=1 을 부른다', async () => {
    const 응답 = await request.get('/api/v1/timelines/public?limit=1');
    await verify('GET /api/v1/timelines/public?limit=1 을 부르면 Link 헤더에 rel="next" 가 있다', (응답.headers()['link'] ?? '').includes('rel="next"'), expected.다음쪽링크있음);
  });
});

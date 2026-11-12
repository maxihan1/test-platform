import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-692',
  name: '인스턴스 정보를 부르면 domain 이 mastodon.maxihan.com 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    도메인: z.string().describe('서버 도메인').default('mastodon.maxihan.com'),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 로 도메인과 언어를 읽는다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    const 몸 = (await 응답.json()) as { domain?: string };
    await verify('인스턴스 정보를 부르면 domain 이 mastodon.maxihan.com 이다', 몸.domain, expected.도메인);
  });
});

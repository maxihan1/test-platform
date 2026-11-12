import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-693',
  name: '인스턴스 정보를 부르면 configuration.urls.streaming 이 wss://mastodon.maxihan.com 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    스트리밍주소: z.string().describe('스트리밍 주소').default('wss://mastodon.maxihan.com'),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 로 스트리밍 주소를 읽는다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    const 몸 = (await 응답.json()) as { configuration?: { urls?: { streaming?: string } } };
    await verify('인스턴스 정보를 부르면 configuration.urls.streaming 이 wss://mastodon.maxihan.com 이다', 몸.configuration?.urls?.streaming, expected.스트리밍주소);
  });
});

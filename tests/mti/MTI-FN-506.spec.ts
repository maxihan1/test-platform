import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-506',
  name: 'GET /.well-known/oauth-authorization-server 를 부르면 Cache-Control 에 max-age=900 이 있다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    캐시시간: z.string().describe('캐시 시간 표시').default('max-age=900'),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /.well-known/oauth-authorization-server 를 부른다', async () => {
    const 응답 = await request.get('/.well-known/oauth-authorization-server');
    await verify('GET /.well-known/oauth-authorization-server 를 부르면 Cache-Control 에 max-age=900 이 있다', (응답.headers()['cache-control'] ?? '').includes(expected.캐시시간), true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-002',
  name: 'GET /api/v1/apps/verify_credentials 를 「Mastodon 앱」 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['「Mastodon 앱」 앱 토큰이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ api, expected }) => {
  await test.step('GET /api/v1/apps/verify_credentials 를 「Mastodon 앱」 토큰으로 부른다', async () => {
    const 응답 = await api('Mastodon 앱').get(`/api/v1/apps/verify_credentials`);
    await verify('GET /api/v1/apps/verify_credentials 를 「Mastodon 앱」 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-001',
  name: 'POST /api/v1/apps 를 토큰 없이 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('POST /api/v1/apps 를 토큰 없이 부른다', async () => {
    const 응답 = await request.post(`/api/v1/apps`, { data: { client_name: 'MTI 시험 앱', redirect_uris: 'urn:ietf:wg:oauth:2.0:oob', scopes: 'read' } });
    await verify('POST /api/v1/apps 를 토큰 없이 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});

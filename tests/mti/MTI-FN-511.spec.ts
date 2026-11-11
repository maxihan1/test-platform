import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱만들기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-511',
  name: 'client_credentials 로 토큰을 받으면 응답에 expires_in 이 없다',
  apiDoc: 1,
  precondition: ['시험 앱이 있다'],
  params: null,
  expected: z.object({
    만료표시있음: z.boolean().describe('expires_in 이 있는지').default(false),
  }),
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  await test.step('시험 앱을 확인한다', async () => {
    await verify('시험 앱이 있다', 앱.client_id !== '', true, { blocker: true });
  });
  await test.step('client_credentials 로 POST /oauth/token 을 부른다', async () => {
    const 응답 = await request.post('/oauth/token', {
      data: { grant_type: 'client_credentials', client_id: 앱.client_id, client_secret: 앱.client_secret, scope: 'read' },
    });
    const 몸 = (await 응답.json()) as Record<string, unknown>;
    await verify('client_credentials 로 토큰을 받으면 응답에 expires_in 이 없다', 'expires_in' in 몸, expected.만료표시있음);
  });
});

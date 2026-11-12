import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱만들기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-509',
  name: 'grant_type=password 로 토큰을 청하면 access_token 을 받지 못한다',
  apiDoc: 1,
  precondition: ['시험 앱이 있다'],
  params: null,
  expected: z.object({
    토큰받음: z.boolean().describe('access_token 을 받는지').default(false),
  }),
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  await test.step('시험 앱을 확인한다', async () => {
    await verify('시험 앱이 있다', 앱.client_id !== '', true, { blocker: true });
  });
  await test.step('grant_type=password 로 POST /oauth/token 을 부른다', async () => {
    const 응답 = await request.post('/oauth/token', {
      data: { grant_type: 'password', client_id: 앱.client_id, client_secret: 앱.client_secret, username: 'mti_nobody', password: 'mti-no-pass' },
    });
    const 몸 = (await 응답.json()) as { access_token?: unknown };
    await verify('grant_type=password 로 토큰을 청하면 access_token 을 받지 못한다', typeof 몸.access_token === 'string', expected.토큰받음);
  });
});

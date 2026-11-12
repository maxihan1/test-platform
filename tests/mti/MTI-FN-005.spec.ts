import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱만들기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-005',
  name: 'POST /oauth/token 을 토큰 없이 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시험 앱이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  await test.step('시험 앱을 확인한다', async () => {
    await verify('시험 앱이 있다', 앱.client_id !== '', true, { blocker: true });
  });
  await test.step('POST /oauth/token 을 토큰 없이 부른다', async () => {
    const 응답 = await request.post('/oauth/token', {
      data: { grant_type: 'client_credentials', client_id: 앱.client_id, client_secret: 앱.client_secret, scope: 'read' },
    });
    await verify('POST /oauth/token 을 토큰 없이 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});

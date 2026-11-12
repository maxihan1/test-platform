import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-006',
  name: 'POST /oauth/revoke 를 토큰 없이 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시험 앱 토큰이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read');
  await test.step('시험 앱 토큰을 확인한다', async () => {
    await verify('시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
  });
  await test.step('POST /oauth/revoke 를 토큰 없이 부른다', async () => {
    const 응답 = await request.post('/oauth/revoke', {
      data: { client_id: 앱.client_id, client_secret: 앱.client_secret, token: 앱토큰 },
    });
    await verify('POST /oauth/revoke 를 토큰 없이 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});

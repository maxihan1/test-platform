import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱만들기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-515',
  name: '틀린 code 로 토큰을 청하면 응답 코드가 400 이다',
  apiDoc: 1,
  precondition: ['시험 앱이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
    오류: z.string().describe('오류 이름').default('invalid_grant'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  await test.step('시험 앱을 확인한다', async () => {
    await verify('시험 앱이 있다', 앱.client_id !== '', true, { blocker: true });
  });
  await test.step('틀린 code 로 grant_type=authorization_code 토큰을 청한다', async () => {
    const 응답 = await request.post('/oauth/token', {
      data: {
        grant_type: 'authorization_code',
        client_id: 앱.client_id,
        client_secret: 앱.client_secret,
        code: 'mti-wrong-code',
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      },
    });
    await verify('틀린 code 로 토큰을 청하면 응답 코드가 400 이다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('오류가 invalid_grant 다', 몸.error, expected.오류);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱만들기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-514',
  name: '틀린 client_secret 으로 토큰을 청하면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['시험 앱이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
    오류: z.string().describe('오류 이름').default('invalid_client'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  await test.step('시험 앱을 확인한다', async () => {
    await verify('시험 앱이 있다', 앱.client_id !== '', true, { blocker: true });
  });
  await test.step('틀린 client_secret 으로 POST /oauth/token 을 부른다', async () => {
    const 응답 = await request.post('/oauth/token', {
      data: { grant_type: 'client_credentials', client_id: 앱.client_id, client_secret: 'mti-wrong-secret', scope: 'read' },
    });
    await verify('틀린 client_secret 으로 토큰을 청하면 응답 코드가 401 이다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('오류가 invalid_client 다', 몸.error, expected.오류);
  });
});

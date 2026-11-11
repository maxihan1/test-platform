import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱만들기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-513',
  name: '등록하지 않은 write 범위 토큰을 청하면 응답 코드가 400 이다',
  apiDoc: 1,
  precondition: ['read 로 등록한 시험 앱이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
    오류: z.string().describe('오류 이름').default('invalid_scope'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  await test.step('시험 앱을 확인한다', async () => {
    await verify('시험 앱이 있다', 앱.client_id !== '', true, { blocker: true });
  });
  await test.step('read 로 등록한 앱으로 write 범위 토큰을 청한다', async () => {
    const 응답 = await request.post('/oauth/token', {
      data: { grant_type: 'client_credentials', client_id: 앱.client_id, client_secret: 앱.client_secret, scope: 'write' },
    });
    await verify('등록하지 않은 write 범위 토큰을 청하면 응답 코드가 400 이다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('오류가 invalid_scope 다', 몸.error, expected.오류);
  });
});

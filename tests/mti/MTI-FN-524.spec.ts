import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-524',
  name: 'read 범위 앱 토큰으로 POST /api/v1/lists 를 부르면 응답 코드가 403 이다',
  apiDoc: 1,
  precondition: ['read 범위만 가진 시험 앱 토큰이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(403),
    오류문구: z.string().describe('오류 문구').default('This action is outside the authorized scopes'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read');
  await test.step('시험 앱 토큰을 확인한다', async () => {
    await verify('read 범위만 가진 시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
  });
  await test.step('read 범위 앱 토큰으로 POST /api/v1/lists 를 부른다', async () => {
    const 응답 = await request.post('/api/v1/lists', { headers: 머리(앱토큰), data: { title: 'MTI 시험 목록' } });
    await verify('read 범위 앱 토큰으로 POST /api/v1/lists 를 부르면 응답 코드가 403 이다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('오류 문구가 「This action is outside the authorized scopes」 다', 몸.error, expected.오류문구);
  });
});

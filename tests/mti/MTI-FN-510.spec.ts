import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱만들기 } from './helpers/auth.helper.js';
import { 인가주소 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-510',
  name: 'code_challenge_method=plain 으로 인가 화면을 열면 응답 코드가 400 이다',
  apiDoc: 1,
  precondition: ['시험 앱이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  await test.step('시험 앱을 확인한다', async () => {
    await verify('시험 앱이 있다', 앱.client_id !== '', true, { blocker: true });
  });
  await test.step('code_challenge_method=plain 으로 GET /oauth/authorize 를 연다', async () => {
    const 응답 = await request.get(인가주소(앱, 'plain'));
    await verify('code_challenge_method=plain 으로 인가 화면을 열면 응답 코드가 400 이다', 응답.status(), expected.응답코드);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입제출, 일회용아이디 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-308',
  name: '위조 방지 토큰 없이 계정 만들기를 제출하면 400 이다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('위조 방지 토큰 없이 계정 만들기를 제출한다', async () => {
    const 아이디 = 일회용아이디();
    const 응답 = await 가입제출(request, { userName: 아이디, email: `${아이디}@example.invalid`, password: 'Qa123456x!', 토큰빼기: true });
    await verify('위조 방지 토큰 없이 계정 만들기를 제출하면 400 이다', 응답.status(), expected.응답코드);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기, 가입하기 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-526',
  name: '이메일 미확인 계정 토큰으로 부르면 응답 코드가 403 이다',
  apiDoc: 1,
  precondition: ['방금 가입해 이메일을 확인하지 않은 계정이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(403),
    오류문구: z.string().describe('오류 문구').default('Your login is missing a confirmed e-mail address'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, expected }) => {
  const 계정 = await 가입하기(request);
  try {
    await test.step('방금 가입한 계정을 확인한다', async () => {
      await verify('방금 가입해 이메일을 확인하지 않은 계정이 있다', 계정.token !== '', true, { blocker: true });
    });
    await test.step('이메일 미확인 계정 토큰으로 GET /api/v1/accounts/verify_credentials 를 부른다', async () => {
      const 응답 = await request.get('/api/v1/accounts/verify_credentials', { headers: 머리(계정.token) });
      await verify('이메일 미확인 계정 토큰으로 부르면 응답 코드가 403 이다', 응답.status(), expected.응답코드);
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('오류 문구가 「Your login is missing a confirmed e-mail address」 다', 몸.error, expected.오류문구);
    });
  } finally {
    await 가입계정지우기(admin, 계정.username);
  }
});

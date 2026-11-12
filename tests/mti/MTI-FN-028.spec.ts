import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기, 가입하기 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-028',
  name: 'POST /api/v1/emails/confirmations 를 방금 가입한 계정 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['방금 가입한 계정 토큰이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, admin, expected }) => {
  const 가입 = await 가입하기(request);
  try {
    await test.step('방금 가입한 계정 토큰을 확인한다', async () => {
      await verify('방금 가입한 계정 토큰이 있다', 가입.token !== '', true, { blocker: true });
    });
    await test.step('POST /api/v1/emails/confirmations 를 방금 가입한 계정 토큰으로 부른다', async () => {
      const 응답 = await request.post('/api/v1/emails/confirmations', { headers: 머리(가입.token) });
      await verify('POST /api/v1/emails/confirmations 를 방금 가입한 계정 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 가입계정지우기(admin, 가입.username);
  }
});

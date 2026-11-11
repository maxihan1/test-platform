import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기 } from './helpers/account.helper.js';
import { 고유이름, 머리, 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';
import { 가입본문 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-586',
  name: 'reason 없이 가입하면 응답에 access_token 이 있다',
  apiDoc: 1,
  precondition: ['쓰기 범위 시험 앱 토큰이 있다'],
  params: null,
  expected: z.object({
    토큰있음: z.boolean().describe('응답에 access_token 이 있는지').default(true),
  }),
});

test(spec, async ({ request, admin, expected }) => {
  const 앱 = await 앱만들기(request, 'read write');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read write');
  const 이름 = 고유이름('mti_');
  try {
    await test.step('쓰기 범위 시험 앱 토큰을 확인한다', async () => {
      await verify('쓰기 범위 시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
    });
    await test.step('reason 없이 POST /api/v1/accounts 로 가입한다', async () => {
      const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(이름) });
      const 몸 = (await 응답.json()) as { access_token?: unknown };
      await verify('reason 없이 가입하면 응답에 access_token 이 있다', typeof 몸.access_token === 'string', expected.토큰있음);
    });
  } finally {
    await 가입계정지우기(admin, 이름);
  }
});

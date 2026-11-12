import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기 } from './helpers/account.helper.js';
import { 고유이름, 머리, 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-012',
  name: 'POST /api/v1/accounts 를 쓰기 범위 시험 앱 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['쓰기 범위 시험 앱 토큰이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
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
    await test.step('POST /api/v1/accounts 를 쓰기 범위 시험 앱 토큰으로 부른다', async () => {
      const 응답 = await request.post('/api/v1/accounts', {
        headers: 머리(앱토큰),
        data: { username: 이름, email: `${이름}@maxihan.com`, password: 고유이름('Mti-pass-'), agreement: true, locale: 'ko' },
      });
      await verify('POST /api/v1/accounts 를 쓰기 범위 시험 앱 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
      const 몸 = (await 응답.json()) as { access_token?: unknown };
      await verify('응답에 새 사용자의 access_token 이 있다', typeof 몸.access_token === 'string', true);
    });
  } finally {
    await 가입계정지우기(admin, 이름);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자로그인 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-167',
  name: '「운영자」 아이디와 비밀번호로 POST /opsapi/login 을 부르면 200 과 token · operator 가 돌아온다',
  apiDoc: 2,
  precondition: ['「운영자」 계정이 있다'],
  params: z.object({
    opsId: z.string().describe('운영자 아이디').optional().meta({ secret: true, account: '운영자' }),
    opsPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true, account: '운영자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('「운영자」 아이디와 비밀번호로 POST /opsapi/login 을 부른다', async () => {
    const 응답 = await 운영자로그인(request, params.opsId ?? '', params.opsPassword ?? '');
    const 몸 = (await 응답.json().catch(() => ({}))) as { token?: unknown; operator?: unknown };
    const 코드 = await verify('POST /opsapi/login 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 토큰 = await verify('응답 token 이 빈 글자가 아니다', typeof 몸.token === 'string' && 몸.token !== '', true);
    const 운영자 = await verify('응답 operator 가 있다', typeof 몸.operator === 'object' && 몸.operator !== null, true);
    await verify('「운영자」 아이디와 비밀번호로 POST /opsapi/login 을 부르면 200 과 token · operator 가 돌아온다', 코드 && 토큰 && 운영자, true);
  });
});

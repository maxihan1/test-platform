import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-560',
  name: 'q 없이 검색하면 응답 코드가 400 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
    오류문구: z.string().describe('오류 문구').default('param is missing or the value is empty or invalid: q'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v2/search 를 q 없이 부른다', async () => {
    const 응답 = await request.get('/api/v2/search', { headers: 머리(토큰) });
    await verify('q 없이 검색하면 응답 코드가 400 이다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('오류 문구가 「param is missing or the value is empty or invalid: q」 다', 몸.error, expected.오류문구);
  });
});

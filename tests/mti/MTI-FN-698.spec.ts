import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-698',
  name: '관리 범위 없이 관리 API 를 부르면 오류 문구가 「This action is outside the authorized scopes」 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    오류문구: z.string().describe('오류 문구').default('This action is outside the authorized scopes'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('관리 범위가 없는 일반 회원 토큰으로 GET /api/v1/admin/accounts 를 부른다', async () => {
    const 응답 = await request.get('/api/v1/admin/accounts', { headers: 머리(토큰) });
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('관리 범위 없이 관리 API 를 부르면 오류 문구가 「This action is outside the authorized scopes」 다', 몸.error, expected.오류문구);
  });
});

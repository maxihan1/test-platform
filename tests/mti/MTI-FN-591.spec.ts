import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내번호 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 계정동작 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-591',
  name: '나 자신을 팔로우하면 응답 코드가 403 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(403),
    오류문구: z.string().describe('오류 문구').default('본인의 계정을 팔로우할 수는 없습니다'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 내 = await 내번호(request, 토큰);
  try {
    await test.step('일반 회원 토큰을 확인한다', async () => {
      await verify('일반 회원 토큰이 있다', 내 !== '', true, { blocker: true });
    });
    await test.step('일반 회원이 자기 계정을 POST /api/v1/accounts/{id}/follow 로 팔로우한다', async () => {
      const 응답 = await request.post(`/api/v1/accounts/${내}/follow`, { headers: 머리(토큰) });
      await verify('나 자신을 팔로우하면 응답 코드가 403 이다', 응답.status(), expected.응답코드);
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('오류 문구가 「본인의 계정을 팔로우할 수는 없습니다」 다', 몸.error, expected.오류문구);
    });
  } finally {
    await 계정동작(request, 토큰, 내, 'unfollow');
  }
});

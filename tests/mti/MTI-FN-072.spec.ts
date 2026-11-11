import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 관계, 내번호 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 계정동작 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-072',
  name: 'POST /api/v1/accounts/{id}/remove_from_followers 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다', '일반 회원 토큰이 있다', '일반 회원이 두 번째 사용자를 팔로우하고 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  const 일반토큰 = params.userPassword ?? '';
  const 번호 = await 계정번호(request, 'qa_user1');
  const 내 = await 내번호(request, 토큰);
  try {
    await test.step('팔로우 상태를 확인한다', async () => {
      await verify('일반 회원이 두 번째 사용자를 팔로우하고 있다', (await 관계(request, 일반토큰, 내)).following, true, { blocker: true });
    });
    await test.step('POST /api/v1/accounts/{id}/remove_from_followers 를 두 번째 사용자 토큰으로 부른다', async () => {
      const 응답 = await request.post(`/api/v1/accounts/${번호}/remove_from_followers`, { headers: 머리(토큰) });
      await verify('POST /api/v1/accounts/{id}/remove_from_followers 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 계정동작(request, 일반토큰, 내, 'follow');
  }
});

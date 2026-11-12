import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 관계 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 계정동작, 잠금바꾸기 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-108',
  name: 'POST /api/v1/follow_requests/{account_id}/reject 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다', '두 번째 사용자 계정을 잠가 두었다', '일반 회원이 두 번째 사용자에게 팔로우 요청을 보내 두었다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰1 = params.userPassword ?? '';
  const 토큰2 = params.user2Password ?? '';
  const 일반회원 = await 계정번호(request, 'qa_user1');
  const 둘째 = await 계정번호(request, 'qa_user2');
  await 잠금바꾸기(request, 토큰2, true);
  await 계정동작(request, 토큰1, 둘째, 'unfollow');
  await 계정동작(request, 토큰1, 둘째, 'follow');
  const 요청함 = (await 관계(request, 토큰1, 둘째)).requested === true;
  try {
    await test.step('두 번째 사용자에게 온 팔로우 요청을 확인한다', async () => {
      await verify('일반 회원이 두 번째 사용자에게 팔로우 요청을 보내 두었다', 요청함, true, { blocker: true });
    });
    await test.step('POST /api/v1/follow_requests/{account_id}/reject 를 두 번째 사용자 토큰으로 부른다', async () => {
      const 응답 = await request.post(`/api/v1/follow_requests/${일반회원}/reject`, { headers: 머리(토큰2) });
      await verify('POST /api/v1/follow_requests/{account_id}/reject 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 잠금바꾸기(request, 토큰2, false);
    await 계정동작(request, 토큰1, 둘째, 'follow');
  }
});

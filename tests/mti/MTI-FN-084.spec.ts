import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 관계 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 계정동작 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-084',
  name: 'POST /api/v1/accounts/{id}/unpin 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '시드 계정 minjun_dev 가 있다', '일반 회원이 minjun_dev 를 프로필에 추천하고 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 번호 = await 계정번호(request, 'minjun_dev');
  await 계정동작(request, 토큰, 번호, 'pin');
  try {
    await test.step('준비한 번호를 확인한다', async () => {
      await verify('시드 계정 minjun_dev 가 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('프로필 추천 상태를 확인한다', async () => {
      await verify('일반 회원이 minjun_dev 를 프로필에 추천하고 있다', (await 관계(request, 토큰, 번호)).endorsed, true, { blocker: true });
    });
    await test.step('POST /api/v1/accounts/{id}/unpin 을 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.post(`/api/v1/accounts/${번호}/unpin`, { headers: 머리(토큰) });
      await verify('POST /api/v1/accounts/{id}/unpin 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 계정동작(request, 토큰, 번호, 'unpin');
  }
});

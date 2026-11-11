import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-701',
  name: '이메일 구독을 부르면 서버 오류(5xx) 없이 응답한다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '시드 계정 hana_photo 가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params }) => {
  const 토큰 = params.userPassword ?? '';
  const 계정 = await 계정번호(request, 'hana_photo');
  await test.step('시드 계정 번호를 확인한다', async () => {
    await verify('시드 계정 hana_photo 가 있다', 계정 !== '', true, { blocker: true });
  });
  await test.step('일반 회원 토큰으로 POST /api/v1/accounts/{hana_photo}/email_subscriptions 를 부른다', async () => {
    const 응답 = await request.post(`/api/v1/accounts/${계정}/email_subscriptions`, { headers: 머리(토큰) });
    await verify('이메일 구독을 부르면 서버 오류(5xx) 없이 응답한다', 응답.status() < 500, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험도메인 } from './helpers/admin.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 도메인차단풀기, 도메인차단하기 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-100',
  name: 'DELETE /api/v1/domain_blocks 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 차단한 도메인이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 도메인 = 시험도메인();
  const 차단코드 = await 도메인차단하기(request, 토큰, 도메인);
  try {
    await test.step('차단한 도메인을 확인한다', async () => {
      await verify('일반 회원이 차단한 도메인이 있다', 차단코드, 200, { blocker: true });
    });
    await test.step('DELETE /api/v1/domain_blocks 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.delete('/api/v1/domain_blocks', { headers: 머리(토큰), data: { domain: 도메인 } });
      await verify('DELETE /api/v1/domain_blocks 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 도메인차단풀기(request, 토큰, 도메인);
  }
});

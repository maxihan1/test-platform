import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 알림설정읽기, 알림설정돌리기 } from './helpers/social.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-230',
  name: 'PATCH /api/v2/notifications/policy 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원의 알림 필터링 설정이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 처음: Record<string, unknown> = {};
  try {
    처음 = await 알림설정읽기(request, 토큰);
    const 새값 = 처음.for_not_following === 'filter' ? 'accept' : 'filter';
    await test.step('처음 알림 필터링 설정을 확인한다', async () => {
      await verify('일반 회원의 알림 필터링 설정이 있다', Object.keys(처음).length > 0, true, { blocker: true });
    });
    await test.step('PATCH /api/v2/notifications/policy 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.patch('/api/v2/notifications/policy', { headers: 머리(토큰), data: { for_not_following: 새값 } });
      await verify('PATCH /api/v2/notifications/policy 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 알림설정돌리기(request, 토큰, 처음);
  }
});

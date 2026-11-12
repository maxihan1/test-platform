import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 예약글들지우기, 예약시각 } from './helpers/post.helper.js';
import { 예약글만들기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-171',
  name: 'PUT /api/v1/scheduled_statuses/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 예약해 둔 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 번호 = await 예약글만들기(request, 토큰, 41);
  try {
    await test.step('시험 예약 글 번호를 확인한다', async () => {
      await verify('일반 회원이 예약해 둔 글이 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('PUT /api/v1/scheduled_statuses/{id} 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.put(`/api/v1/scheduled_statuses/${번호}`, { headers: 머리(토큰), data: { scheduled_at: 예약시각(42, 0) } });
      await verify('PUT /api/v1/scheduled_statuses/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 예약글들지우기(request, 토큰, [번호]);
  }
});

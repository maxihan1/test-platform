import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글올리기, 예약글들지우기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-620',
  name: '예약 시각을 5분 뒤로 쓰면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    바깥쪽응답코드: z.number().describe('예약 시각이 5분 뒤일 때 응답 코드').default(422),
    안쪽응답코드: z.number().describe('예약 시각이 6분 뒤일 때 응답 코드').default(200),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('scheduled_at 을 지금부터 5분 뒤로 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { visibility: 'direct', scheduled_at: new Date(Date.now() + 5 * 60_000).toISOString() });
      만든.push(await 응답번호(응답));
      await verify('예약 시각을 5분 뒤로 쓰면 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
    await test.step('scheduled_at 을 지금부터 6분 뒤로 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { visibility: 'direct', scheduled_at: new Date(Date.now() + 6 * 60_000).toISOString() });
      만든.push(await 응답번호(응답));
      await verify('예약 시각 6분 뒤 글의 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
  } finally {
    await 예약글들지우기(request, 토큰, 만든);
  }
});

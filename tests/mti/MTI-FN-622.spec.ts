import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글올리기, 예약글들지우기, 예약시각, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-622',
  name: 'scheduled_at 을 주고 글을 쓰면 응답에 scheduled_at 과 params 가 있다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('scheduled_at 을 40일 뒤로 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { visibility: 'direct', scheduled_at: 예약시각(40, 30) });
      만든.push(await 응답번호(응답));
      const 몸 = (await 응답.json()) as { scheduled_at?: unknown; params?: unknown };
      const 예약 = await verify('응답에 scheduled_at 이 있다', typeof 몸.scheduled_at === 'string', true);
      const 내용 = await verify('응답에 params 가 있다', typeof 몸.params === 'object' && 몸.params !== null, true);
      await verify('scheduled_at 을 주고 글을 쓰면 응답에 scheduled_at 과 params 가 있다', 예약 && 내용, true);
      await verify('응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 예약글들지우기(request, 토큰, 만든);
  }
});

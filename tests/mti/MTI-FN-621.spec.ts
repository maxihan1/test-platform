import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글올리기, 예약글들지우기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-621',
  name: '예약 시각이 5분 이내면 오류 문구에 「미래의 날짜여야 합니다」 가 있다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    오류문구: z.string().describe('예약 시각이 너무 이를 때 오류 문구에 있어야 할 말').default('미래의 날짜여야 합니다'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('scheduled_at 을 지금부터 1분 뒤로 POST /api/v1/statuses 를 부른다', async () => {
      const 응답 = await 글올리기(request, 토큰, { visibility: 'direct', scheduled_at: new Date(Date.now() + 60_000).toISOString() });
      만든.push(await 응답번호(응답));
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('예약 시각이 5분 이내면 오류 문구에 「미래의 날짜여야 합니다」 가 있다', (몸.error ?? '').includes(expected.오류문구), true);
    });
  } finally {
    await 예약글들지우기(request, 토큰, 만든);
  }
});

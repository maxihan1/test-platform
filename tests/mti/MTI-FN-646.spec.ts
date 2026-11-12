import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 설문글쓰기 } from './helpers/post.helper.js';
import { 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-646',
  name: 'choices 없이 투표하면 응답 코드가 400 이다',
  apiDoc: 1,
  precondition: ['일반 회원이 쓴 설문이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 토큰2 = params.user2Password ?? '';
  const 설문 = await 설문글쓰기(request, 토큰);
  try {
    await test.step('시험 설문 번호를 확인한다', async () => {
      await verify('일반 회원이 쓴 설문이 있다', 설문.설문 !== '', true, { blocker: true });
    });
    await test.step('두 번째 사용자가 choices 없이 투표한다', async () => {
      const 응답 = await request.post(`/api/v1/polls/${설문.설문}/votes`, { headers: 머리(토큰2), data: {} });
      await verify('choices 없이 투표하면 응답 코드가 400 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글지우기(request, 토큰, 설문.글);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글쓰기, 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-627',
  name: '남의 글을 고치면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['일반 회원이 쓴 글이 있다', '두 번째 사용자 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('남의 글을 고치거나 지울 때 응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 토큰2 = params.user2Password ?? '';
  const 번호 = await 글쓰기(request, 토큰);
  try {
    await test.step('시험 글 번호를 확인한다', async () => {
      await verify('일반 회원이 쓴 글이 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('두 번째 사용자 토큰으로 일반 회원의 글을 PUT /api/v1/statuses/{id} 로 고친다', async () => {
      const 응답 = await request.put(`/api/v1/statuses/${번호}`, { headers: 머리(토큰2), data: { status: 'MTI 남이 고친 글' } });
      await verify('남의 글을 고치면 응답 코드가 404 다', 응답.status(), expected.응답코드);
    });
    await test.step('두 번째 사용자 토큰으로 일반 회원의 글을 DELETE /api/v1/statuses/{id} 로 지운다', async () => {
      const 응답 = await request.delete(`/api/v1/statuses/${번호}`, { headers: 머리(토큰2) });
      await verify('남의 글 삭제의 응답 코드가 404 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글지우기(request, 토큰, 번호);
  }
});

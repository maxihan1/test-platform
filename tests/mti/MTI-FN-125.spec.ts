import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓰기, 글지우기 } from './helpers/status.helper.js';
import { 머리, 없는번호 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-125',
  name: 'DELETE /api/v1/statuses/{id} 를 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다', '일반 회원 토큰이 있다', '일반 회원이 쓴 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    토큰없음응답코드: z.number().describe('토큰 없이 부를 때 응답 코드').default(401),
    없는번호응답코드: z.number().describe('없는 번호로 부를 때 응답 코드').default(404),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  번호 = await 글쓰기(request, 토큰);
  try {
    await test.step('시험 글 번호를 확인한다', async () => {
      await verify('일반 회원이 쓴 글이 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('DELETE /api/v1/statuses/{id} 를 토큰 없이 부른다', async () => {
      const 응답 = await request.delete(`/api/v1/statuses/${번호}`);
      await verify('DELETE /api/v1/statuses/{id} 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
    });
    await test.step('DELETE /api/v1/statuses/{id} 를 없는 번호로 부른다', async () => {
      const 응답 = await request.delete(`/api/v1/statuses/${없는번호}`, { headers: 머리(토큰) });
      await verify('DELETE /api/v1/statuses/{id} 를 없는 번호로 부른 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
    });
  } finally {
    await 글지우기(request, 토큰, 번호);
  }
});

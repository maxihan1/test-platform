import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 없는번호 } from './helpers/auth.helper.js';
import { 추천태그만들기, 추천태그지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-269',
  name: 'DELETE /api/v1/featured_tags/{id} 를 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다', '두 번째 사용자 토큰이 있다', '두 번째 사용자의 추천 해시태그가 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    토큰없음응답코드: z.number().describe('토큰 없이 부를 때 응답 코드').default(401),
    없는번호응답코드: z.number().describe('없는 번호로 부를 때 응답 코드').default(404),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  let 번호 = '';
  번호 = await 추천태그만들기(request, 토큰);
  try {
    await test.step('시험 추천 해시태그 번호를 확인한다', async () => {
      await verify('두 번째 사용자의 추천 해시태그가 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('DELETE /api/v1/featured_tags/{id} 를 토큰 없이 부른다', async () => {
      const 응답 = await request.delete(`/api/v1/featured_tags/${번호}`);
      await verify('DELETE /api/v1/featured_tags/{id} 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
    });
    await test.step('DELETE /api/v1/featured_tags/{id} 를 없는 번호로 부른다', async () => {
      const 응답 = await request.delete(`/api/v1/featured_tags/${없는번호}`, { headers: 머리(토큰) });
      await verify('DELETE /api/v1/featured_tags/{id} 를 없는 번호로 부른 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
    });
  } finally {
    await 추천태그지우기(request, 토큰, 번호);
  }
});

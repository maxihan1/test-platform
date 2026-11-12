import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 없는번호 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-255',
  name: 'POST /api/v1/tags/{name}/follow 를 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다', '두 번째 사용자 토큰이 있다'],
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
  await test.step('POST /api/v1/tags/{name}/follow 를 토큰 없이 부른다', async () => {
    const 응답 = await request.post(`/api/v1/tags/${encodeURIComponent('mti시험태그')}/follow`);
    await verify('POST /api/v1/tags/{name}/follow 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
  });
  await test.step('POST /api/v1/tags/{name}/follow 를 없는 번호로 부른다', async () => {
    const 응답 = await request.post(`/api/v1/tags/${없는번호}/follow`, { headers: 머리(토큰) });
    await verify('POST /api/v1/tags/{name}/follow 를 없는 번호로 부른 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
  });
});

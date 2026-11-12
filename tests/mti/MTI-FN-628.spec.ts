import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 고정글수, 고정풀기, 고정하기 } from './helpers/post.helper.js';
import { 글쓰기, 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-628',
  name: '고정 글 5개째를 고정하면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다', '두 번째 사용자가 고정한 글이 네 개다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('다섯째 글을 고정할 때 응답 코드').default(200),
    바깥쪽응답코드: z.number().describe('여섯째 글을 고정할 때 응답 코드').default(422),
    미리고정한수: z.number().describe('미리 고정한 글 수').default(4),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰2 = params.user2Password ?? '';
  const 글들: string[] = [];
  try {
    for (let i = 0; i < 6; i += 1) 글들.push(await 글쓰기(request, 토큰2));
    for (const 번호 of 글들.slice(0, 4)) await 고정하기(request, 토큰2, 번호);
    const 고정수 = await 고정글수(request, 토큰2);
    await test.step('두 번째 사용자가 고정한 글 개수를 확인한다', async () => {
      await verify('두 번째 사용자가 고정한 글이 네 개다', 고정수, expected.미리고정한수, { blocker: true });
    });
    await test.step('두 번째 사용자가 다섯째 글을 고정한다', async () => {
      const 응답 = await request.post(`/api/v1/statuses/${글들[4]}/pin`, { headers: 머리(토큰2) });
      await verify('고정 글 5개째를 고정하면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('두 번째 사용자가 여섯째 글을 고정한다', async () => {
      const 응답 = await request.post(`/api/v1/statuses/${글들[5]}/pin`, { headers: 머리(토큰2) });
      await verify('고정 글 6개째 고정의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    for (const 번호 of 글들) {
      await 고정풀기(request, 토큰2, 번호);
      await 글지우기(request, 토큰2, 번호);
    }
  }
});

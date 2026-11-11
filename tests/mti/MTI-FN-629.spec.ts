import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 부스트풀기, 부스트하기 } from './helpers/post.helper.js';
import { 글쓰기, 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-629',
  name: '부스트를 고정하면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다', '두 번째 사용자가 부스트한 글이 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰2 = params.user2Password ?? '';
  const 원본 = await 글쓰기(request, 토큰2);
  const 부스트 = await 부스트하기(request, 토큰2, 원본);
  try {
    await test.step('두 번째 사용자가 부스트한 글 번호를 확인한다', async () => {
      await verify('두 번째 사용자가 부스트한 글이 있다', 부스트 !== '', true, { blocker: true });
    });
    await test.step('두 번째 사용자가 부스트한 글을 POST /api/v1/statuses/{id}/pin 으로 고정한다', async () => {
      const 응답 = await request.post(`/api/v1/statuses/${부스트}/pin`, { headers: 머리(토큰2) });
      await verify('부스트를 고정하면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 부스트풀기(request, 토큰2, 원본);
    await 글지우기(request, 토큰2, 원본);
  }
});

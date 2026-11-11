import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글과미디어지우기 } from './helpers/post.helper.js';
import { 미디어올리기, 미디어지우기 } from './helpers/resource.helper.js';
import { 글쓰기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-596',
  name: 'delete_media=true 로 지우면 붙어 있던 미디어를 조회할 때 404 다',
  apiDoc: 1,
  precondition: ['일반 회원이 그림을 붙여 쓴 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('붙어 있던 미디어를 조회할 때 응답 코드').default(404),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 미디어 = await 미디어올리기(request, 토큰);
  const 번호 = await 글쓰기(request, 토큰, { media_ids: [미디어] });
  try {
    await test.step('그림을 붙여 쓴 글 번호를 확인한다', async () => {
      await verify('일반 회원이 그림을 붙여 쓴 글이 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('delete_media=true 로 DELETE /api/v1/statuses/{id} 를 부른다', async () => {
      await request.delete(`/api/v1/statuses/${번호}?delete_media=true`, { headers: 머리(토큰) });
      const 응답 = await request.get(`/api/v1/media/${미디어}`, { headers: 머리(토큰) });
      await verify('delete_media=true 로 지우면 붙어 있던 미디어를 조회할 때 404 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글과미디어지우기(request, 토큰, 번호);
    await 미디어지우기(request, 토큰, 미디어);
  }
});

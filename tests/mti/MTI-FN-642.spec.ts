import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글과미디어지우기 } from './helpers/post.helper.js';
import { 미디어올리기, 미디어지우기 } from './helpers/resource.helper.js';
import { 글쓰기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-642',
  name: '남의 미디어를 조회하면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['일반 회원이 올린 미디어가 있다', '일반 회원이 글에 붙인 미디어가 있다', '두 번째 사용자 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('남의 미디어나 붙은 미디어를 다룰 때 응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 토큰2 = params.user2Password ?? '';
  const 남는미디어 = await 미디어올리기(request, 토큰);
  const 붙일미디어 = await 미디어올리기(request, 토큰);
  const 번호 = await 글쓰기(request, 토큰, { media_ids: [붙일미디어] });
  try {
    await test.step('올린 미디어와 글에 붙인 미디어를 확인한다', async () => {
      await verify('일반 회원이 올린 미디어가 있다', 남는미디어 !== '', true, { blocker: true });
      await verify('일반 회원이 글에 붙인 미디어가 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('두 번째 사용자 토큰으로 남의 미디어를 GET /api/v1/media/{id} 로 부른다', async () => {
      const 응답 = await request.get(`/api/v1/media/${남는미디어}`, { headers: 머리(토큰2) });
      await verify('남의 미디어를 조회하면 응답 코드가 404 다', 응답.status(), expected.응답코드);
    });
    await test.step('글에 붙은 미디어를 PUT /api/v1/media/{id} 로 고친다', async () => {
      const 응답 = await request.put(`/api/v1/media/${붙일미디어}`, { headers: 머리(토큰), multipart: { description: 'MTI 고친 설명' } });
      await verify('글에 붙은 미디어 수정의 응답 코드가 404 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글과미디어지우기(request, 토큰, 번호);
    await 미디어지우기(request, 토큰, 남는미디어);
    await 미디어지우기(request, 토큰, 붙일미디어);
  }
});

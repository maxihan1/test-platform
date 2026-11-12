import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 팔로워글번호 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-562',
  name: '볼 수 없는 글을 일반 회원 토큰으로 부르면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['두 번째 사용자만 볼 수 있는 yuna_locked 의 팔로워 공개 글이 있다', '일반 회원 토큰이 있다', '두 번째 사용자 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 글 = await 팔로워글번호(request, params.user2Password ?? '', 'yuna_locked');
  await test.step('팔로워 공개 글 번호를 확인한다', async () => {
    await verify('두 번째 사용자만 볼 수 있는 yuna_locked 의 팔로워 공개 글이 있다', 글 !== '', true, { blocker: true });
  });
  await test.step('일반 회원 토큰으로 그 글을 GET /api/v1/statuses/{id} 로 부른다', async () => {
    const 응답 = await request.get(`/api/v1/statuses/${글}`, { headers: 머리(params.userPassword ?? '') });
    await verify('볼 수 없는 글을 일반 회원 토큰으로 부르면 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
});

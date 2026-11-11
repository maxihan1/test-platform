import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 잠긴계정비공개글, 즐겨찾기풀기 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-626',
  name: '볼 수 없는 글을 즐겨찾기하면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['일반 회원이 볼 수 없는 yuna_locked 의 팔로워 공개 글이 있다'],
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
  const 토큰 = params.userPassword ?? '';
  const 비공개글 = await 잠긴계정비공개글(request, params.user2Password ?? '');
  try {
    await test.step('일반 회원이 볼 수 없는 yuna_locked 의 팔로워 공개 글을 확인한다', async () => {
      await verify('일반 회원이 볼 수 없는 yuna_locked 의 팔로워 공개 글이 있다', 비공개글 !== '', true, { blocker: true });
    });
    await test.step('일반 회원 토큰으로 그 글을 즐겨찾기한다', async () => {
      const 응답 = await request.post(`/api/v1/statuses/${비공개글}/favourite`, { headers: 머리(토큰) });
      await verify('볼 수 없는 글을 즐겨찾기하면 응답 코드가 404 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 즐겨찾기풀기(request, 토큰, 비공개글);
  }
});

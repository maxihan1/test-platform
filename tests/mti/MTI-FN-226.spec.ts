import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 즐겨찾기하기, 알림묶음키찾기 } from './helpers/social.helper.js';
import { 글쓰기, 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-226',
  name: 'POST /api/v2/notifications/{group_key}/dismiss 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원에게 새 알림이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 보낸토큰 = params.user2Password ?? '';
  let 글 = '';
  try {
    글 = await 글쓰기(request, 토큰);
    await 즐겨찾기하기(request, 보낸토큰, 글);
    const 묶음 = await 알림묶음키찾기(request, 토큰, 글);
    await test.step('준비한 알림을 확인한다', async () => {
      await verify('일반 회원에게 새 알림이 있다', 묶음 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v2/notifications/{group_key}/dismiss 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.post(`/api/v2/notifications/${encodeURIComponent(묶음)}/dismiss`, { headers: 머리(토큰) });
      await verify('POST /api/v2/notifications/{group_key}/dismiss 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글지우기(request, 토큰, 글);
  }
});

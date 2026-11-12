import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 내계정이름, 쪽지보내기, 대화번호찾기, 대화지우기 } from './helpers/social.helper.js';
import { 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-202',
  name: 'DELETE /api/v1/conversations/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '두 번째 사용자가 일반 회원에게 보낸 대화가 있다'],
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
  let 대화 = '';
  try {
    글 = await 쪽지보내기(request, 보낸토큰, await 내계정이름(request, 토큰));
    대화 = await 대화번호찾기(request, 토큰, 글);
    await test.step('준비한 대화를 확인한다', async () => {
      await verify('두 번째 사용자가 일반 회원에게 보낸 대화가 있다', 대화 !== '', true, { blocker: true });
    });
    await test.step('DELETE /api/v1/conversations/{id} 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.delete(`/api/v1/conversations/${대화}`, { headers: 머리(토큰) });
      await verify('DELETE /api/v1/conversations/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 대화지우기(request, 토큰, 대화);
    await 글지우기(request, 보낸토큰, 글);
  }
});

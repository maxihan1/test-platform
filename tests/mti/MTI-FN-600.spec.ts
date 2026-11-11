import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-600',
  name: 'status 없이 설문만 붙여 글을 쓰면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('status 를 비우고 설문만 붙여 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { status: '', poll: { options: ['사과', '배'], expires_in: 3600 } });
      만든.push(await 응답번호(응답));
      await verify('status 없이 설문만 붙여 글을 쓰면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-617',
  name: '같은 설문 항목 둘로 글을 쓰면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('같은 항목 둘로 설문 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { poll: { options: ['사과', '사과'], expires_in: 3600 } });
      만든.push(await 응답번호(응답));
      await verify('같은 설문 항목 둘로 글을 쓰면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

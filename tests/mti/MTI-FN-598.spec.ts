import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-598',
  name: '공개 경고문과 합쳐 500자를 넘는 글을 쓰면 응답 코드가 422 다',
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
    await test.step('spoiler_text 와 합쳐 501자가 되게 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { status: '가'.repeat(300), spoiler_text: '나'.repeat(201) });
      만든.push(await 응답번호(응답));
      await verify('공개 경고문과 합쳐 500자를 넘는 글을 쓰면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

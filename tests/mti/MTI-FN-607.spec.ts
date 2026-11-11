import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-607',
  name: '공개 경고문을 넣어 글을 쓰면 sensitive 가 true 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    민감: z.boolean().describe('공개 경고문이 있는 글의 sensitive').default(true),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('spoiler_text 를 넣고 sensitive 없이 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { spoiler_text: 'MTI 시험 경고문' });
      만든.push(await 응답번호(응답));
      const 몸 = (await 응답.json()) as { sensitive?: boolean };
      await verify('공개 경고문을 넣어 글을 쓰면 sensitive 가 true 다', 몸.sensitive, expected.민감);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

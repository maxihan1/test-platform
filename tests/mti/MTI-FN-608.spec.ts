import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-608',
  name: 'language=en 으로 글을 쓰면 글의 language 가 en 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    언어: z.string().describe('글의 언어 코드').default('en'),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('language=en 으로 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { language: 'en' });
      만든.push(await 응답번호(응답));
      const 몸 = (await 응답.json()) as { language?: string };
      await verify('language=en 으로 글을 쓰면 글의 language 가 en 이다', 몸.language, expected.언어);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-624',
  name: '예상하지 않은 계정을 멘션하면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
    오류문구: z.string().describe('예상하지 않은 멘션의 오류 문구').default('Post would be sent to unexpected accounts'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('allowed_mentions[] 에 hana_photo 만 넣고 @qa_user2 를 멘션한 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { status: 'MTI 멘션 시험 글 @qa_user2', allowed_mentions: ['hana_photo'] });
      만든.push(await 응답번호(응답));
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('예상하지 않은 계정을 멘션하면 응답 코드가 422 다', 응답.status(), expected.응답코드);
      await verify('오류 문구가 「Post would be sent to unexpected accounts」 다', 몸.error, expected.오류문구);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

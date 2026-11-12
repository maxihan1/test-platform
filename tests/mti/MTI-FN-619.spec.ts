import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-619',
  name: 'multiple 없이 설문 글을 쓰면 poll.multiple 이 false 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    여러항목: z.boolean().describe('기본 설문의 multiple').default(false),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('multiple · hide_totals 없이 설문 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { poll: { options: ['사과', '배'], expires_in: 3600 } });
      만든.push(await 응답번호(응답));
      const 몸 = (await 응답.json()) as { poll?: { multiple?: boolean } | null };
      await verify('multiple 없이 설문 글을 쓰면 poll.multiple 이 false 다', 몸.poll?.multiple, expected.여러항목);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

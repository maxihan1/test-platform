import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글과미디어지우기, 글올리기, 미디어들지우기, 응답번호 } from './helpers/post.helper.js';
import { 미디어올리기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-613',
  name: '미디어와 설문을 함께 붙이면 응답 코드가 200 이 아니다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 올린 미디어가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    성공응답코드: z.number().describe('거절되면 나오면 안 되는 응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 미디어 = await 미디어올리기(request, 토큰);
  const 만든: string[] = [];
  try {
    await test.step('올린 미디어를 확인한다', async () => {
      await verify('일반 회원이 올린 미디어가 있다', 미디어 !== '', true, { blocker: true });
    });
    await test.step('미디어와 설문을 함께 붙여 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { media_ids: [미디어], poll: { options: ['사과', '배'], expires_in: 3600 } });
      만든.push(await 응답번호(응답));
      await verify('미디어와 설문을 함께 붙이면 응답 코드가 200 이 아니다', 응답.status() !== expected.성공응답코드, true);
    });
  } finally {
    for (const 번호 of 만든) await 글과미디어지우기(request, 토큰, 번호);
    await 미디어들지우기(request, 토큰, [미디어]);
  }
});

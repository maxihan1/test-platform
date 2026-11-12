import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-597',
  name: '500자 글을 쓰면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('500자 글의 응답 코드').default(200),
    바깥쪽응답코드: z.number().describe('501자 글의 응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('500자 글을 POST /api/v1/statuses 로 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { status: '가'.repeat(500) });
      만든.push(await 응답번호(응답));
      await verify('500자 글을 쓰면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('501자 글을 POST /api/v1/statuses 로 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { status: '가'.repeat(501) });
      만든.push(await 응답번호(응답));
      await verify('501자 글의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

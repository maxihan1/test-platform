import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-117',
  name: 'POST /api/v1/statuses 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
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
  let 번호 = '';
  try {
    await test.step('POST /api/v1/statuses 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.post('/api/v1/statuses', { headers: 머리(토큰), data: { status: 'MTI 시험 글', visibility: 'unlisted' } });
      await verify('POST /api/v1/statuses 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
      번호 = ((await 응답.json()) as { id?: string }).id ?? '';
    });
  } finally {
    await 글지우기(request, 토큰, 번호);
  }
});

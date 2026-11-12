import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/auth.helper.js';
import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-625',
  name: '같은 Idempotency-Key 로 두 번 쓰면 두 응답의 id 가 같다',
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
  const 열쇠 = 고유이름('mti-idem-');
  const 만든: string[] = [];
  try {
    await test.step('같은 Idempotency-Key 로 POST /api/v1/statuses 를 두 번 부른다', async () => {
      const 첫째 = await 글올리기(request, 토큰, { status: 'MTI 같은 열쇠 시험 글' }, { 'Idempotency-Key': 열쇠 });
      const 첫째번호 = await 응답번호(첫째);
      만든.push(첫째번호);
      const 둘째 = await 글올리기(request, 토큰, { status: 'MTI 같은 열쇠 시험 글' }, { 'Idempotency-Key': 열쇠 });
      const 둘째번호 = await 응답번호(둘째);
      만든.push(둘째번호);
      await verify('같은 Idempotency-Key 로 두 번 쓰면 두 응답의 id 가 같다', 둘째번호, 첫째번호);
      await verify('둘째 응답 코드가 200 이다', 둘째.status(), expected.응답코드);
    });
  } finally {
    await 글들지우기(request, 토큰, [...new Set(만든)]);
  }
});

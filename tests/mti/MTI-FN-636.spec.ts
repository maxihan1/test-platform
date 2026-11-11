import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 큰해상도그림파일 } from './helpers/post.helper.js';
import { 미디어지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-636',
  name: '해상도 곱이 33,177,600 을 넘는 그림을 올리면 응답 코드가 200 이 아니다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    성공응답코드: z.number().describe('거절되면 나오면 안 되는 응답 코드').default(200),
  }),
  held: '보류 — 해상도 곱이 33,177,600 을 넘는 시험 그림 파일이 없다',
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  try {
    await test.step('해상도 곱이 33,177,600 을 넘는 그림을 올린다', async () => {
      const 응답 = await request.post('/api/v2/media', { headers: 머리(토큰), multipart: { file: 큰해상도그림파일() } });
      번호 = ((await 응답.json().catch(() => ({}))) as { id?: string }).id ?? '';
      await verify('해상도 곱이 33,177,600 을 넘는 그림을 올리면 응답 코드가 200 이 아니다', 응답.status() !== expected.성공응답코드, true);
    });
  } finally {
    await 미디어지우기(request, 토큰, 번호);
  }
});

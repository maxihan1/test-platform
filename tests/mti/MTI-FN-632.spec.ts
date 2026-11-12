import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 그림파일, 미디어지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-632',
  name: 'v2 로 그림을 올리면 응답 코드가 200 이나 202 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    끝난응답코드: z.number().describe('처리가 끝났을 때 응답 코드').default(200),
    처리중응답코드: z.number().describe('처리 중일 때 응답 코드').default(202),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  try {
    await test.step('POST /api/v2/media 로 작은 그림을 올린다', async () => {
      const 응답 = await request.post('/api/v2/media', { headers: 머리(토큰), multipart: { file: 그림파일(), description: 'MTI 시험 그림' } });
      번호 = ((await 응답.json()) as { id?: string }).id ?? '';
      await verify('v2 로 그림을 올리면 응답 코드가 200 이나 202 다', 응답.status() === expected.끝난응답코드 || 응답.status() === expected.처리중응답코드, true);
    });
  } finally {
    await 미디어지우기(request, 토큰, 번호);
  }
});

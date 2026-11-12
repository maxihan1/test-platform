import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-568',
  name: '요청 언어 없이 501자 글을 쓰면 오류 문구에 한글이 있다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params }) => {
  const 토큰 = params.userPassword ?? '';
  let 글 = '';
  try {
    await test.step('Accept-Language 없이 501자 글을 쓴다', async () => {
      const 응답 = await request.post('/api/v1/statuses', { headers: 머리(토큰), data: { status: '가'.repeat(501) } });
      const 몸 = (await 응답.json()) as { id?: string; error?: string };
      글 = 몸.id ?? '';
      await verify('요청 언어 없이 501자 글을 쓰면 오류 문구에 한글이 있다', /[가-힣]/.test(몸.error ?? ''), true);
    });
  } finally {
    await 글지우기(request, 토큰, 글);
  }
});

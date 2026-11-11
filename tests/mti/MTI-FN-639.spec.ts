import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글자파일 } from './helpers/post.helper.js';
import { 그림파일, 미디어지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-639',
  name: '썸네일 처리가 실패하면 응답 코드가 500 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(500),
  }),
  techniques: ['동등 분할'],
  held: '보류 — 썸네일 처리 실패를 일부러 낼 길이 없다',
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  try {
    await test.step('썸네일 처리에 실패하는 파일을 올린다', async () => {
      const 응답 = await request.post('/api/v2/media', { headers: 머리(토큰), multipart: { file: 그림파일(), thumbnail: 글자파일() } });
      번호 = ((await 응답.json().catch(() => ({}))) as { id?: string }).id ?? '';
      await verify('썸네일 처리가 실패하면 응답 코드가 500 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 미디어지우기(request, 토큰, 번호);
  }
});

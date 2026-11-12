import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글자파일 } from './helpers/post.helper.js';
import { 미디어지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-638',
  name: '지원하지 않는 형식을 올리면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
    오류문구: z.string().describe('지원하지 않는 형식의 오류 문구').default('File type of uploaded media could not be verified'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  try {
    await test.step('글자 파일을 POST /api/v1/media 로 올린다', async () => {
      const 응답 = await request.post('/api/v1/media', { headers: 머리(토큰), multipart: { file: 글자파일() } });
      const 몸 = (await 응답.json()) as { id?: string; error?: string };
      번호 = 몸.id ?? '';
      await verify('지원하지 않는 형식을 올리면 응답 코드가 422 다', 응답.status(), expected.응답코드);
      await verify('오류 문구가 「File type of uploaded media could not be verified」 다', 몸.error, expected.오류문구);
    });
  } finally {
    await 미디어지우기(request, 토큰, 번호);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글과미디어지우기, 글올리기, 동영상파일, 미디어들지우기, 응답번호 } from './helpers/post.helper.js';
import { 미디어올리기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-611',
  name: '사진과 동영상을 섞어 붙이면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 올린 사진과 동영상이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
  held: '보류 — 케이스 안에서 만들 시험 동영상 파일이 없다',
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 사진 = await 미디어올리기(request, 토큰);
  const 동영상응답 = await request.post('/api/v2/media', { headers: 머리(토큰), multipart: { file: 동영상파일() } });
  const 동영상 = await 응답번호(동영상응답);
  const 만든: string[] = [];
  try {
    await test.step('올린 사진과 동영상을 확인한다', async () => {
      await verify('일반 회원이 올린 사진과 동영상이 있다', 사진 !== '' && 동영상 !== '', true, { blocker: true });
    });
    await test.step('사진과 동영상을 함께 붙여 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { media_ids: [사진, 동영상] });
      만든.push(await 응답번호(응답));
      await verify('사진과 동영상을 섞어 붙이면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    for (const 번호 of 만든) await 글과미디어지우기(request, 토큰, 번호);
    await 미디어들지우기(request, 토큰, [사진, 동영상]);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 파일올리기, 시험동영상파일 } from './helpers/media.helper.js';
import { 글과미디어지우기, 글올리기, 미디어들지우기, 응답번호 } from './helpers/post.helper.js';
import { 그림파일 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-709',
  name: '사진과 동영상을 섞어 붙이면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 올린 사진과 동영상이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('사진과 동영상을 섞어 붙일 때 응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 미디어들: string[] = [];
  let 글 = '';
  try {
    const 사진 = await 파일올리기(request, 토큰, 그림파일());
    const 동영상 = await 파일올리기(request, 토큰, 시험동영상파일());
    미디어들.push(사진.번호, 동영상.번호);
    await test.step('올린 사진과 동영상을 확인한다', async () => {
      await verify('일반 회원이 올린 사진과 동영상이 있다', 사진.번호 !== '' && 동영상.번호 !== '', true, { blocker: true });
    });
    await test.step('사진과 동영상을 함께 붙여 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { media_ids: [사진.번호, 동영상.번호] });
      글 = await 응답번호(응답);
      await verify('사진과 동영상을 섞어 붙이면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글과미디어지우기(request, 토큰, 글);
    await 미디어들지우기(request, 토큰, 미디어들);
  }
});

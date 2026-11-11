import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글과미디어지우기, 글올리기, 동영상파일, 미디어들지우기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-612',
  name: '처리 중인 미디어를 붙이면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 올린 미디어가 처리 중이다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
    올리기응답코드: z.number().describe('처리 중인 미디어를 올릴 때 응답 코드').default(202),
  }),
  techniques: ['동등 분할'],
  held: '보류 — 미디어가 처리 중인 순간을 일부러 붙잡을 길이 없다',
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 올리기 = await request.post('/api/v2/media', { headers: 머리(토큰), multipart: { file: 동영상파일() } });
  const 미디어 = await 응답번호(올리기);
  const 만든: string[] = [];
  try {
    await test.step('처리 중인 미디어를 확인한다', async () => {
      await verify('일반 회원이 올린 미디어가 처리 중이다', 올리기.status(), expected.올리기응답코드, { blocker: true });
    });
    await test.step('처리가 끝나지 않은 미디어를 붙여 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { media_ids: [미디어] });
      만든.push(await 응답번호(응답));
      await verify('처리 중인 미디어를 붙이면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    for (const 번호 of 만든) await 글과미디어지우기(request, 토큰, 번호);
    await 미디어들지우기(request, 토큰, [미디어]);
  }
});

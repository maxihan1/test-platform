import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 없는번호, 머리 } from './helpers/auth.helper.js';
import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';
import { 그림파일, 미디어지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-614',
  name: '없는 미디어를 붙이면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '두 번째 사용자가 올린 미디어가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('없는 미디어를 붙일 때 응답 코드').default(422),
    오류문구: z.string().describe('남의 미디어를 붙일 때 오류 문구에 있어야 할 말').default('찾을 수 없거나 이미 다른 게시물에 첨부되었습니다'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 토큰2 = params.user2Password ?? '';
  const 올리기 = await request.post('/api/v1/media', { headers: 머리(토큰2), multipart: { file: 그림파일(), description: 'MTI 시험 그림' } });
  const 남의미디어 = await 응답번호(올리기);
  const 만든: string[] = [];
  try {
    await test.step('두 번째 사용자가 올린 미디어를 확인한다', async () => {
      await verify('두 번째 사용자가 올린 미디어가 있다', 남의미디어 !== '', true, { blocker: true });
    });
    await test.step('없는 media_ids 로 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { media_ids: [없는번호] });
      만든.push(await 응답번호(응답));
      await verify('없는 미디어를 붙이면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
    await test.step('일반 회원이 남의 media_ids 로 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { media_ids: [남의미디어] });
      만든.push(await 응답번호(응답));
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('남의 미디어를 붙인 글의 오류 문구에 「찾을 수 없거나 이미 다른 게시물에 첨부되었습니다」 가 있다', (몸.error ?? '').includes(expected.오류문구), true);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
    await 미디어지우기(request, 토큰2, 남의미디어);
  }
});

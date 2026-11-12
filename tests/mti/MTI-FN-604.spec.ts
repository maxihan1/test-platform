import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 없는번호 } from './helpers/auth.helper.js';
import { 글들지우기, 글올리기, 응답번호, 잠긴계정비공개글 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-604',
  name: '없는 글에 답장하면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 볼 수 없는 yuna_locked 의 팔로워 공개 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    없는글응답코드: z.number().describe('없는 글에 답장할 때 응답 코드').default(404),
    오류문구: z.string().describe('없는 글에 답장할 때 오류 문구').default('답장하려는 게시물이 존재하지 않습니다.'),
    볼수없는글응답코드: z.number().describe('볼 수 없는 글에 답장할 때 응답 코드').default(404),
  }),
  techniques: ['동등 분할', '결정 테이블'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 비공개글 = await 잠긴계정비공개글(request, params.user2Password ?? '');
  const 만든: string[] = [];
  try {
    await test.step('일반 회원이 볼 수 없는 yuna_locked 의 팔로워 공개 글을 확인한다', async () => {
      await verify('일반 회원이 볼 수 없는 yuna_locked 의 팔로워 공개 글이 있다', 비공개글 !== '', true, { blocker: true });
    });
    await test.step('in_reply_to_id 를 없는 번호로 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { in_reply_to_id: 없는번호 });
      만든.push(await 응답번호(응답));
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('없는 글에 답장하면 응답 코드가 404 다', 응답.status(), expected.없는글응답코드);
      await verify('오류 문구가 「답장하려는 게시물이 존재하지 않습니다.」 다', 몸.error, expected.오류문구);
    });
    await test.step('in_reply_to_id 를 볼 수 없는 글로 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { in_reply_to_id: 비공개글 });
      만든.push(await 응답번호(응답));
      await verify('볼 수 없는 글에 단 답장의 응답 코드가 404 다', 응답.status(), expected.볼수없는글응답코드);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-005',
  name: '글 번호를 지정하지 않고 댓글을 조회하면 전체 댓글이 돌아온다',
  precondition: ['댓글 데모 API에 접근할 수 있다'],
  params: z.object({
    postId: z.number().describe('댓글을 조회할 글 번호. 비워 두면 전체 댓글을 조회한다').optional(),
  }),
  expected: z.object({
    statusCode: z.number().describe('응답 코드').default(200),
    minCount: z.number().describe('최소로 기대하는 댓글 수').default(100),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let comments: unknown[] = [];

  await test.step('댓글을 조회한다', async () => {
    const base = 'https://jsonplaceholder.typicode.com/comments';
    const url = params.postId === undefined ? base : `${base}?postId=${params.postId}`;
    const res = await request.get(url);
    await verify('응답 코드가 기대와 같다', res.status(), expected.statusCode, { blocker: true });
    comments = await res.json();
  });

  await test.step('돌아온 댓글 수를 확인한다', async () => {
    await verify('댓글이 최소 기대 수보다 많이 돌아온다', comments.length > expected.minCount, true);
  });
});

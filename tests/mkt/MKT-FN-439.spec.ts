import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시드글번호 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-439',
  name: '게시글 상세를 부를 때마다 조회수가 1 오른다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('같은 게시글 상세를 두 번 부른다', async () => {
    const 글번호 = await 시드글번호(request);
    const 처음 = await request.get(`/api/posts/${글번호}`);
    await verify('응답 코드가 200이다', 처음.status(), 200, { blocker: true });
    const 다시 = await request.get(`/api/posts/${글번호}`);
    const 처음조회수 = ((await 처음.json()) as { views: number }).views;
    const 다시조회수 = ((await 다시.json()) as { views: number }).views;
    await verify('게시글 상세를 부를 때마다 조회수가 1 오른다', 다시조회수 - 처음조회수, 1);
  });
});

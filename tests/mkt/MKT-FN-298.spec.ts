import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글하나쓰기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-298',
  name: '내 글을 PUT 으로 고치면 다시 조회할 때 고친 제목이 돌아온다',
  precondition: ['회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;

  try {
    await test.step('회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('회원으로 로그인한 요청이다', await 로그인해있나(request), true, { blocker: true });
    });

    await test.step('내 글을 만든 뒤 PUT /api/posts/{id} 로 제목을 고친다', async () => {
      const 글 = await 글하나쓰기(request, '고칠글');
      const 고친제목 = `${글.제목} 수정`;
      await request.put(`/api/posts/${String(글.id)}`, { data: { category: '자유', title: 고친제목, content: 글.본문, images: [] } });
      const 다시 = (await (await request.get(`/api/posts/${String(글.id)}`)).json()) as { title: string };
      await verify('내 글을 PUT 으로 고치면 다시 조회할 때 고친 제목이 돌아온다', 다시.title, 고친제목);
    });

    await test.step('내 글을 만든 뒤 DELETE /api/posts/{id} 로 지운다', async () => {
      const 글 = await 글하나쓰기(request, '지울글');
      await request.delete(`/api/posts/${String(글.id)}`);
      const 다시 = await request.get(`/api/posts/${String(글.id)}`);
      await verify('내 글을 DELETE 하면 다시 조회할 때 404 로 응답한다', 다시.status(), 404);
    });
  } finally {
    await 정리.모두하기();
  }
});

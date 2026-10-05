import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기 } from './components/data.component.js';
import { 고유이름, 글본문10자, 세션아이디, 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-442',
  name: '글 작성 요청은 201 로 응답한다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 정리 = new 정리함();
  try {
    const 처음제목 = 고유이름('쓴글');
    const 바꾼제목 = 고유이름('고친글');
    let 글번호 = 0;

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(request, 정리);
    });

    await test.step('로그인을 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await 세션아이디(request)) !== '', true, { blocker: true });
    });

    await test.step('글 작성 POST /api/posts 를 보낸다', async () => {
      const res = await request.post('/api/posts', { data: { category: '자유', title: 처음제목, content: 글본문10자, images: [] } });
      await verify('글 작성 요청은 201 로 응답한다', res.status(), 201);
      글번호 = ((await res.json()) as { id: number }).id;
      정리.더하기(() => 글지우기(request, 글번호));
    });

    await test.step('내 글의 제목을 PUT /api/posts/{id} 로 바꾼다', async () => {
      const res = await request.put(`/api/posts/${글번호}`, { data: { category: '자유', title: 바꾼제목, content: 글본문10자, images: [] } });
      const 고친글 = (await (await request.get(`/api/posts/${글번호}`)).json()) as { title: string };
      await verify('내 글 수정 요청은 200 이고 제목이 바뀐다', { 응답: res.status(), 제목: 고친글.title }, { 응답: 200, 제목: 바꾼제목 });
    });

    await test.step('내 글을 DELETE /api/posts/{id} 로 지운다', async () => {
      const res = await request.delete(`/api/posts/${글번호}`);
      await verify('내 글 삭제 요청은 204 로 응답한다', res.status(), 204);
    });
  } finally {
    await 정리.비우기();
  }
});

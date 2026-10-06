import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 내글만들기, 댓글목록받기, 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-448',
  name: '댓글 작성 요청은 201 로 응답한다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 정리 = new 정리함();
  try {
    let 글번호 = 0;
    let 댓글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 글을 만든다', async () => {
      await 회원로그인(request, 정리);
      글번호 = (await 내글만들기(request, 정리)).id;
    });

    await test.step('내 글에 댓글 POST 를 보낸다', async () => {
      const res = await request.post(`/api/posts/${글번호}/comments`, { data: { content: 고유이름('댓글'), parentId: null } });
      await verify('댓글 작성 요청은 201 로 응답한다', res.status(), 201);
      댓글번호 = ((await res.json()) as { id: number }).id;
    });

    await test.step('그 댓글의 id 를 parentId 로 답글 POST 를 보낸다', async () => {
      const res = await request.post(`/api/posts/${글번호}/comments`, { data: { content: 고유이름('답글'), parentId: 댓글번호 } });
      await verify('답글 작성 요청은 201 로 응답한다', res.status(), 201, { blocker: true });
      const 답글번호 = ((await res.json()) as { id: number }).id;
      const 답글 = (await 댓글목록받기(request, 글번호)).find((댓글) => 댓글.id === 답글번호);
      await verify('답글의 parentId 가 그 댓글 id 다', 답글?.parentId, 댓글번호);
    });

    await test.step('그 글의 댓글 목록을 부른다', async () => {
      await verify('댓글 목록에 댓글과 답글 2건이 온다', (await 댓글목록받기(request, 글번호)).length, 2);
    });
  } finally {
    await 정리.비우기();
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 내글만들기, 댓글목록받기, 댓글여럿달기, 세션아이디, 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-451',
  name: '내 댓글 수정 요청은 200 이고 내용이 바뀐다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 댓글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 정리 = new 정리함();
  try {
    const 바꾼내용 = 고유이름('고친댓글');
    let 글번호 = 0;
    let 댓글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 댓글이 달린 글을 만든다', async () => {
      await 회원로그인(request, 정리);
      글번호 = (await 내글만들기(request, 정리)).id;
      댓글번호 = (await 댓글여럿달기(request, 글번호, [고유이름('댓글')]))[0] ?? 0;
    });

    await test.step('로그인과 내 댓글을 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await 세션아이디(request)) !== '', true, { blocker: true });
      await verify('내 댓글이 있다', (await 댓글목록받기(request, 글번호)).some((댓글) => 댓글.id === 댓글번호), true, { blocker: true });
    });

    await test.step('내 댓글을 PUT /api/comments/{id} 로 고친다', async () => {
      const res = await request.put(`/api/comments/${댓글번호}`, { data: { content: 바꾼내용 } });
      const 고친댓글 = (await 댓글목록받기(request, 글번호)).find((댓글) => 댓글.id === 댓글번호);
      await verify('내 댓글 수정 요청은 200 이고 내용이 바뀐다', { 응답: res.status(), 내용: 고친댓글?.content }, { 응답: 200, 내용: 바꾼내용 });
    });

    await test.step('내 댓글을 DELETE /api/comments/{id} 로 지운다', async () => {
      const res = await request.delete(`/api/comments/${댓글번호}`);
      await verify('내 댓글 삭제 요청은 204 로 응답한다', res.status(), 204);
    });
  } finally {
    await 정리.비우기();
  }
});

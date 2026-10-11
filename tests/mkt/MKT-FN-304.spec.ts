import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-304',
  name: '내 댓글을 PUT 으로 고치면 200 으로 응답한다',
  precondition: ['회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 글번호 = 0;
  let 댓글번호 = 0;

  try {
    await test.step('회원으로 로그인해 글과 댓글을 만든다', async () => {
      나 = await 임시회원으로로그인(request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '댓글글')).id;
      댓글번호 = await 댓글달기(나.api, 글번호, '고칠 내 댓글');
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('회원으로 로그인한 요청이다', await 로그인해있나(request), true, { blocker: true });
    });

    await test.step('내 댓글을 PUT /api/comments/{id} 로 고친다', async () => {
      const res = await request.put(`/api/comments/${String(댓글번호)}`, { data: { content: '고친 내 댓글' } });
      await verify('내 댓글을 PUT 으로 고치면 200 으로 응답한다', res.status(), 200);
    });

    await test.step('내 댓글을 DELETE /api/comments/{id} 로 지운다', async () => {
      const res = await request.delete(`/api/comments/${String(댓글번호)}`);
      await verify('내 댓글을 DELETE 하면 204 로 응답한다', res.status(), 204);
    });
  } finally {
    await 정리.모두하기();
  }
});

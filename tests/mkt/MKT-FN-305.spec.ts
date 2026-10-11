import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-305',
  name: '다른 회원 댓글을 DELETE 하려 하면 403 으로 응답한다',
  precondition: ['다른 회원이 단 댓글이 하나 있다', '로그인하지 않은 요청이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 남!: 둘째회원;
  let 댓글번호 = 0;

  try {
    await test.step('다른 회원이 글을 쓰고 댓글을 달고 회원으로 로그인한다', async () => {
      남 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(남));
      const 글 = await 글하나쓰기(남.api, '댓글글');
      댓글번호 = await 댓글달기(남.api, 글.id, '다른 회원이 단 댓글');
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('회원으로 로그인한 요청이다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('회원으로 그 댓글에 DELETE /api/comments/{id} 를 보낸다', async () => {
      const res = await page.request.delete(`/api/comments/${String(댓글번호)}`);
      await verify('다른 회원 댓글을 DELETE 하려 하면 403 으로 응답한다', res.status(), 403);
    });

    await test.step('로그인 없이 PUT /api/comments/{id} 를 보낸다', async () => {
      const res = await request.put(`/api/comments/${String(댓글번호)}`, { data: { content: '로그인 없이 고치는 댓글' } });
      await verify('로그인 없이 댓글을 고치려 하면 401 로 응답한다', res.status(), 401);
    });
  } finally {
    await 정리.모두하기();
  }
});

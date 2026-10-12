import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-319',
  name: '로그인 없이 댓글을 고치려 하면 401 로 응답한다',
  precondition: ['로그인하지 않은 요청이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 댓글번호 = 0;

  try {
    await test.step('회원이 글과 댓글을 만든다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      const 글 = await 글하나쓰기(글쓴.api, '댓글글');
      댓글번호 = await 댓글달기(글쓴.api, 글.id, '로그인 없이 고칠 댓글');
    });

    await test.step('로그인하지 않은 요청인지 확인한다', async () => {
      await verify('로그인하지 않은 요청이다', !(await 로그인해있나(request)), true, { blocker: true });
    });

    await test.step('로그인 없이 PUT /api/comments/{id} 를 보낸다', async () => {
      const res = await request.put(`/api/comments/${String(댓글번호)}`, { data: { content: '로그인 없이 고치는 댓글' } });
      await verify('로그인 없이 댓글을 고치려 하면 401 로 응답한다', res.status(), 401);
    });
  } finally {
    await 정리.모두하기();
  }
});

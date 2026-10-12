import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 댓글목록, 둘째회원열기, 둘째회원정리하기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-283',
  name: '남의 댓글을 고치려고 부르면 403 으로 응답한다',
  precondition: ['다른 회원이 단 댓글이 있다', '비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 나!: 글쓴이;
  let 글번호 = 0;
  let 댓글번호 = 0;

  try {
    await test.step('한 회원이 글과 댓글을 만들고 다른 새 회원으로 로그인한다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '댓글글')).id;
      댓글번호 = await 댓글달기(글쓴.api, 글번호, '다른 회원이 단 댓글');
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('다른 회원이 단 댓글이 있고 비회원인 요청이 있는지 확인한다', async () => {
      await verify('다른 회원이 단 댓글이 있다', (await 댓글목록(나.api, 글번호)).some((댓글) => 댓글.id === 댓글번호), true, { blocker: true });
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('새 회원으로 그 댓글에 PUT /api/comments/{id} 를 부른다', async () => {
      const res = await 나.api.put(`/api/comments/${String(댓글번호)}`, { data: { content: '남의 댓글을 고치는 내용' } });
      await verify('남의 댓글을 고치려고 부르면 403 으로 응답한다', res.status(), 403);
    });

    await test.step('새 회원으로 그 댓글에 DELETE /api/comments/{id} 를 부른다', async () => {
      const res = await 나.api.delete(`/api/comments/${String(댓글번호)}`);
      await verify('남의 댓글을 지우려고 부르면 403 으로 응답한다', res.status(), 403);
    });

    await test.step('비회원으로 PUT /api/comments/1 을 부른다', async () => {
      const res = await request.put('/api/comments/1', { data: { content: '로그인 없이 고치는 댓글' } });
      await verify('비회원이 댓글 수정을 부르면 401 로 응답한다', res.status(), 401);
    });
  } finally {
    await 정리.모두하기();
  }
});

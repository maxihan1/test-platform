import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 댓글목록, 둘째회원열기, 둘째회원정리하기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-281',
  name: '비회원이 부른 댓글 목록 조회는 200 으로 응답한다',
  precondition: ['비회원이다', '댓글이 달린 글이 있다'],
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
      댓글번호 = await 댓글달기(글쓴.api, 글번호, '비회원이 읽을 댓글');
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('비회원이고 댓글이 달린 글이 있는지 확인한다', async () => {
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
      await verify('댓글이 달린 글이 있다', (await 댓글목록(글쓴.api, 글번호)).some((댓글) => 댓글.id === 댓글번호), true, { blocker: true });
    });

    await test.step('비회원으로 GET /api/posts/{id}/comments 를 부른다', async () => {
      const res = await request.get(`/api/posts/${String(글번호)}/comments`);
      await verify('비회원이 부른 댓글 목록 조회는 200 으로 응답한다', res.status(), 200);
    });

    await test.step('회원으로 parentId 를 넣어 POST /api/posts/{id}/comments 를 부른다', async () => {
      await 나.api.post(`/api/posts/${String(글번호)}/comments`, { data: { content: '답글입니다', parentId: 댓글번호 } });
      const 답글 = (await 댓글목록(나.api, 글번호)).find((댓글) => 댓글.parentId === 댓글번호);
      await verify('parentId 를 넣어 댓글 작성을 부르면 그 댓글의 답글이 생긴다', 답글?.content, '답글입니다');
    });
  } finally {
    await 정리.모두하기();
  }
});

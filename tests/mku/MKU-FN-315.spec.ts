import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 댓글목록, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-315',
  name: '로그인 없이 댓글 목록을 부르면 200 으로 댓글 목록이 돌아온다',
  precondition: ['로그인하지 않은 요청이다', '새로 가입한 회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 글을 하나 쓴다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '댓글글')).id;
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('회원으로 로그인한 요청이다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('GET /api/posts/{id}/comments 를 부른다', async () => {
      const res = await request.get(`/api/posts/${String(글번호)}/comments`);
      const 본문 = (await res.json()) as { items?: unknown };
      await verify('로그인 없이 댓글 목록을 부르면 200 으로 댓글 목록이 돌아온다', res.status() === 200 && Array.isArray(본문.items), true);
    });

    await test.step('parentId 를 넣어 POST /api/posts/{id}/comments 를 보낸다', async () => {
      const 원댓글 = await 댓글달기(나.api, 글번호, '원댓글입니다');
      const 답글 = await 댓글달기(나.api, 글번호, '답글입니다', 원댓글);
      const 같은댓글 = (await 댓글목록(나.api, 글번호)).find((댓글) => 댓글.id === 답글);
      await verify('parentId 를 넣어 댓글을 보내면 그 댓글의 답글로 만들어진다', 같은댓글?.parentId, 원댓글);
    });
  } finally {
    await 정리.모두하기();
  }
});

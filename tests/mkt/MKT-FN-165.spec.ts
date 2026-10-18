import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 댓글수세기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 댓글달기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-165',
  name: '답글에는 「답글」 버튼이 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원 글의 댓글에 답글이 하나 달려 있다'],
  techniques: ['동등 분할', '상태 전이'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 댓글내용 = 고유글자('원 댓글');
  const 답글내용 = 고유글자('달린 답글');

  try {
    await test.step('회원이 글을 쓰고 댓글과 그 댓글의 답글을 하나씩 단다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '답글 버튼 확인');
      const 댓글번호 = await 댓글달기(page.request, 준비.글.글번호, 댓글내용);
      await 댓글달기(page.request, 준비.글.글번호, 답글내용, 댓글번호);
    });

    await test.step('댓글과 답글이 달렸는지 확인한다', async () => {
      await verify('글에 댓글과 답글이 두 개 달려 있다', await 댓글수세기(page.request, 준비.글?.글번호 ?? 0), 2, { blocker: true });
    });

    await test.step('그 답글을 확인한다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      const 답글줄 = 글.댓글줄(답글내용);
      await 답글줄.waitFor();
      await verify('답글에는 「답글」 버튼이 보이지 않는다', await 글.답글버튼(답글줄).isVisible(), false);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

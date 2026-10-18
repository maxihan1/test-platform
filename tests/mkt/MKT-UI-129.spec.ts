import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 댓글수세기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 댓글달기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-129',
  name: '「답글」을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원 글에 댓글이 하나 달려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 댓글내용 = 고유글자('답글 칸 확인 댓글');

  try {
    await test.step('회원이 글을 쓰고 댓글을 하나 단다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '답글 입력칸 확인');
      await 댓글달기(page.request, 준비.글.글번호, 댓글내용);
    });

    await test.step('댓글이 달렸는지 확인한다', async () => {
      await verify('글에 댓글이 하나 달려 있다', await 댓글수세기(page.request, 준비.글?.글번호 ?? 0), 1, { blocker: true });
    });

    await test.step('그 댓글의 「답글」을 누른다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      const 줄 = 글.댓글줄(댓글내용);
      await 줄.waitFor();
      await 글.답글버튼(줄).click();
      await verify('「답글」을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다', await 글.답글입력(줄).isVisible(), true);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 댓글수세기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 댓글달기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-124',
  name: '댓글에 작성자 · 작성 시각 · 내용이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원 글에 댓글이 하나 달려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 댓글내용 = 고유글자('댓글 모양 확인');

  try {
    await test.step('회원이 글을 쓰고 댓글을 하나 단다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '댓글 모양 확인');
      await 댓글달기(page.request, 준비.글.글번호, 댓글내용);
    });

    await test.step('댓글이 달렸는지 확인한다', async () => {
      await verify('글에 댓글이 하나 달려 있다', await 댓글수세기(page.request, 준비.글?.글번호 ?? 0), 1, { blocker: true });
    });

    await test.step('그 댓글을 확인한다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      const 줄 = 글.댓글줄(댓글내용);
      await 줄.waitFor();
      await verify('댓글에 작성자 · 작성 시각 · 내용이 보인다', [await 글.작성자표시(줄, 준비.글?.회원.name ?? '').isVisible(), await 글.시각표시(줄).isVisible(), await 줄.getByText(댓글내용).isVisible()], [true, true, true]);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

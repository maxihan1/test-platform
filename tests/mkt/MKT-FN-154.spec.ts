import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 댓글수세기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 댓글달기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-154',
  name: '댓글 영역 제목이 「댓글 2」이다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원 글에 댓글 「첫 댓글」 · 「둘째 댓글」이 차례로 달려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 글을 쓰고 댓글 「첫 댓글」 · 「둘째 댓글」을 차례로 단다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '댓글 영역 확인');
      await 댓글달기(page.request, 준비.글.글번호, '첫 댓글');
      await 댓글달기(page.request, 준비.글.글번호, '둘째 댓글');
    });

    await test.step('댓글이 달렸는지 확인한다', async () => {
      await verify('글에 댓글이 두 개 달려 있다', await 댓글수세기(page.request, 준비.글?.글번호 ?? 0), 2, { blocker: true });
    });

    await test.step('그 글 상세의 댓글 영역을 확인한다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글줄('둘째 댓글').waitFor();
      await verify('댓글 영역 제목이 「댓글 2」이다', await 글.댓글제목.innerText(), '댓글 2');
    });

    await test.step('댓글 목록 순서를 확인한다', async () => {
      await verify('댓글 목록이 「첫 댓글」 · 「둘째 댓글」 순서(오래된 순)로 보인다', await 글.댓글내용들.allInnerTexts(), ['첫 댓글', '둘째 댓글']);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

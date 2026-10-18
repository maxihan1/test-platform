import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 댓글달기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-168',
  name: '댓글을 고쳐 저장하면 그 댓글에 「(수정됨)」이 붙는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 댓글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 처음내용 = 고유글자('고치기 전 댓글');
  const 고친내용 = 고유글자('고친 뒤 댓글');

  try {
    await test.step('회원이 글을 쓰고 댓글을 하나 단다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '댓글 수정 확인');
      await 댓글달기(page.request, 준비.글.글번호, 처음내용);
    });

    await test.step('쓴 글의 상세에서 댓글이 보이는지 확인한다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글줄(처음내용).waitFor();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('내가 쓴 댓글에 「수정」이 보인다', await 글.수정버튼(글.댓글줄(처음내용)).isVisible(), true, { blocker: true });
    });

    await test.step('댓글 내용을 고치고 「저장」을 누른다', async () => {
      const 줄 = 글.댓글줄(처음내용);
      await 글.수정버튼(줄).click();
      await 글.수정입력(줄).fill(고친내용);
      await 글.저장버튼(줄).click();
      await 글.댓글줄(고친내용).waitFor();
      await verify('댓글을 고쳐 저장하면 그 댓글에 「(수정됨)」이 붙는다', await 글.수정됨표시(글.댓글줄(고친내용)).isVisible(), true);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

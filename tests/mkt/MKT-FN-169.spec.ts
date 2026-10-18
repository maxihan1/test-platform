import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 댓글달기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-169',
  name: '답글이 달린 댓글을 지우면 그 자리에 「삭제된 댓글입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원 댓글에 답글이 하나 달려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 댓글내용 = 고유글자('지울 댓글');
  const 답글내용 = 고유글자('남을 답글');

  try {
    await test.step('회원이 글을 쓰고 댓글과 그 댓글의 답글을 하나씩 단다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '댓글 삭제 확인');
      const 댓글번호 = await 댓글달기(page.request, 준비.글.글번호, 댓글내용);
      await 댓글달기(page.request, 준비.글.글번호, 답글내용, 댓글번호);
    });

    await test.step('쓴 글의 상세에서 댓글과 답글이 보이는지 확인한다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글줄(답글내용).waitFor();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('지울 댓글이 보인다', await 글.댓글줄(댓글내용).isVisible(), true, { blocker: true });
    });

    await test.step('그 댓글을 삭제한다', async () => {
      await 글.삭제버튼들(글.댓글줄(댓글내용)).click();
      await 글.댓글줄(댓글내용).waitFor({ state: 'detached' });
      await verify('답글이 달린 댓글을 지우면 그 자리에 「삭제된 댓글입니다」가 보인다', await 글.삭제된자리.isVisible(), true);
    });

    await test.step('댓글을 지운 뒤 답글을 확인한다', async () => {
      await verify('답글이 달린 댓글을 지워도 답글은 그대로 보인다', await 글.댓글줄(답글내용).isVisible(), true);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

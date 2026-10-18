import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 댓글수세기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 댓글달기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-171',
  name: '답글이 0개인 댓글을 지우면 댓글이 목록에서 사라진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원 댓글에 답글이 없다', '회원 댓글에 답글이 하나 달려 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 홀로댓글 = 고유글자('답글 없는 댓글');
  const 부모댓글 = 고유글자('답글 있는 댓글');
  const 자식답글 = 고유글자('매달린 답글');

  try {
    await test.step('회원이 글을 쓰고 답글 없는 댓글과 답글이 하나 달린 댓글을 단다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '답글 수 경계 확인');
      await 댓글달기(page.request, 준비.글.글번호, 홀로댓글);
      const 부모번호 = await 댓글달기(page.request, 준비.글.글번호, 부모댓글);
      await 댓글달기(page.request, 준비.글.글번호, 자식답글, 부모번호);
    });

    await test.step('쓴 글의 상세에서 댓글이 보이는지 확인한다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글줄(자식답글).waitFor();
      await verify('글에 댓글 둘과 답글 하나가 달려 있다', await 댓글수세기(page.request, 준비.글?.글번호 ?? 0), 3, { blocker: true });
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
    });

    await test.step('답글 없는 댓글을 삭제한다', async () => {
      await 글.삭제버튼들(글.댓글줄(홀로댓글)).click();
      await 글.댓글줄(홀로댓글).waitFor({ state: 'detached' });
      await verify('답글이 0개인 댓글을 지우면 댓글이 목록에서 사라진다', await 글.댓글줄(홀로댓글).count(), 0);
    });

    await test.step('답글 하나가 달린 댓글을 삭제한다', async () => {
      await 글.삭제버튼들(글.댓글줄(부모댓글)).click();
      await 글.댓글줄(부모댓글).waitFor({ state: 'detached' });
      await verify('답글이 1개인 댓글을 지우면 댓글 자리가 목록에 남는다', await 글.삭제된자리.isVisible(), true);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 댓글수세기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 보낸요청끝날때까지 } from './helpers/common-tools.helper.js';
import { 고유글자 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-525',
  name: '댓글 「등록」을 빠르게 두 번 눌러도 댓글이 하나만 생긴다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 댓글내용 = 고유글자('두 번 누른 댓글');

  try {
    await test.step('회원이 쓴 글을 만든다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '댓글 두 번 등록 확인');
    });

    await test.step('쓴 글의 상세를 연다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글불러올때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('댓글 영역 제목이 「댓글 0」이다', await 글.댓글제목.innerText(), '댓글 0', { blocker: true });
    });

    await test.step('댓글을 적고 「등록」을 빠르게 두 번 누른다', async () => {
      await 글.댓글적기(댓글내용);
      await 보낸요청끝날때까지(page, '/comments', async () => {
        await 글.등록버튼.dblclick();
      });
      await verify('댓글 「등록」을 빠르게 두 번 눌러도 댓글이 하나만 생긴다', await 댓글수세기(page.request, 준비.글?.글번호 ?? 0), 1);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

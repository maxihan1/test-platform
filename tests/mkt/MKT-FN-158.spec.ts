import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 글제목읽기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-158',
  name: '댓글 입력칸에 5자를 적으면 글자 수가 「5/300」으로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 쓴 글을 만든다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '글자 수 확인');
    });

    await test.step('쓴 글의 상세를 연다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글불러올때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('쓴 글이 만들어져 있다', await 글제목읽기(page.request, 준비.글?.글번호 ?? 0), 준비.글?.제목, { blocker: true });
    });

    await test.step('댓글 입력칸에 5자를 적는다', async () => {
      await 글.댓글적기('가나다라마');
      await verify('댓글 입력칸에 5자를 적으면 글자 수가 「5/300」으로 바뀐다', await 글.글자수.innerText(), '5/300');
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

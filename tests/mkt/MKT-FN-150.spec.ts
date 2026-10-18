import { defineCase, test, verify } from '@platform/kit';
import { 모달 } from './components/modal.component.js';
import { 토스트 } from './components/toast.component.js';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-150',
  name: '삭제 모달에서 「삭제」를 누르면 게시판 목록으로 가고 토스트 「삭제되었습니다」가 나온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 목록 = new 게시판목록화면(page);
  const 확인창 = new 모달(page);
  const 알림 = new 토스트(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 쓴 글을 만든다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '삭제 확인');
    });

    await test.step('쓴 글의 상세를 연다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.머리글.로그인꼴일때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('게시글 상세 제목이 방금 쓴 글 제목이다', await 글.제목.innerText(), 준비.글?.제목, { blocker: true });
    });

    await test.step('삭제 모달에서 「삭제」를 누른다', async () => {
      await 글.삭제버튼.click();
      await 확인창.뜰때까지(확인창.창);
      await 확인창.버튼(확인창.창, '삭제').click();
      const 토스트글 = await (await 알림.아무거나뜰때까지()).innerText();
      await 목록.내용그려질때까지();
      await verify('삭제 모달에서 「삭제」를 누르면 게시판 목록으로 가고 토스트 「삭제되었습니다」가 나온다', [await 목록.제목.isVisible(), 토스트글], [true, '삭제되었습니다']);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

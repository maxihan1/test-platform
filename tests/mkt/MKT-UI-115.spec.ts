import { defineCase, test, verify } from '@platform/kit';
import { 모달 } from './components/modal.component.js';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-115',
  name: '좋아요 확인 모달의 「취소」를 누르면 모달이 닫히고 게시글 상세에 머문다',
  platforms: ['desktop', 'mobile'],
  precondition: ['좋아요 확인 모달이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 글 = new 게시글화면(page);
  const 확인창 = new 모달(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 쓴 글을 만들고 비회원으로 「좋아요」를 눌러 확인 모달을 띄운다', async () => {
      준비.글 = await 글쓴이와글만들기(request, '모달 취소 확인');
      await 방해창막기(page);
      await 글.열기(준비.글.글번호);
      await 글.비회원좋아요모달띄우기();
    });

    await test.step('좋아요 확인 모달이 떠 있는지 확인한다', async () => {
      await verify('좋아요 확인 모달이 보인다', await 확인창.창.isVisible(), true, { blocker: true });
    });

    await test.step('좋아요 확인 모달의 「취소」를 누른다', async () => {
      await 확인창.버튼(확인창.창, '취소').click();
      await 확인창.닫힐때까지(확인창.창);
      await verify('좋아요 확인 모달의 「취소」를 누르면 모달이 닫히고 게시글 상세에 머문다', [await 확인창.창.isVisible(), await 글.제목.isVisible()], [false, true]);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(request, 준비.글);
  }
});

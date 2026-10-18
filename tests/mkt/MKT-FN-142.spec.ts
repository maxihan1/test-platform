import { defineCase, test, verify } from '@platform/kit';
import { 모달 } from './components/modal.component.js';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-142',
  name: '비회원이 「좋아요」를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 뜬다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 글 = new 게시글화면(page);
  const 확인창 = new 모달(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 쓴 글을 만든다', async () => {
      준비.글 = await 글쓴이와글만들기(request, '비회원 좋아요 확인');
    });

    await test.step('그 글의 상세를 연다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await verify('비회원이라 머리글에 「로그아웃」이 없다', await 글.머리글.로그아웃버튼.count(), 0, { blocker: true });
      await verify('게시글 상세 제목이 방금 쓴 글 제목이다', await 글.제목.innerText(), 준비.글?.제목, { blocker: true });
    });

    await test.step('비회원으로 게시글 상세에서 「좋아요」를 누른다', async () => {
      await 글.좋아요.click();
      await 확인창.뜰때까지(확인창.창);
      await verify('비회원이 「좋아요」를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 뜬다', await 확인창.글이든('로그인이 필요합니다. 로그인 화면으로 이동할까요?').isVisible(), true);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(request, 준비.글);
  }
});

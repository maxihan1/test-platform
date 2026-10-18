import { defineCase, test, verify } from '@platform/kit';
import { 모달 } from './components/modal.component.js';
import { 토스트 } from './components/toast.component.js';
import { 로그인요청 } from './helpers/account.helper.js';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 댓글수세기, 클립보드권한주기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 댓글달기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-390',
  name: '게시글 상세에서 「좋아요」를 누르면 로그인 확인 모달이 뜬다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '클립보드 권한을 주었다', '대상 서버 주소가 http 라 브라우저에 클립보드가 없어 가짜 클립보드(모킹)를 쓴다', '회원 글에 댓글이 하나 달려 있다', '회원이 쓴 글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 글 = new 게시글화면(page);
  const 목록 = new 게시판목록화면(page);
  const 쓰기 = new 글쓰기화면(page);
  const 확인창 = new 모달(page);
  const 알림 = new 토스트(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 댓글내용 = 고유글자('버튼 반응 확인 댓글');

  try {
    await test.step('회원이 글을 쓰고 댓글을 하나 달고 클립보드 권한을 준다', async () => {
      준비.글 = await 글쓴이와글만들기(request, '글 상세 버튼 반응');
      await 댓글달기(request, 준비.글.글번호, 댓글내용);
      await 클립보드권한주기(page);
      await 방해창막기(page);
    });

    await test.step('쓴 글과 댓글이 비회원에게 보이는지 확인한다', async () => {
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글불러올때까지();
      await verify('비회원이라 머리글에 「로그아웃」이 없다', await 글.머리글.로그아웃버튼.count(), 0, { blocker: true });
      await verify('글에 댓글이 하나 달려 있다', await 댓글수세기(request, 준비.글?.글번호 ?? 0), 1, { blocker: true });
    });

    await test.step('게시글 상세에서 「좋아요」를 누른다', async () => {
      await 글.비회원좋아요모달띄우기();
      await verify('게시글 상세에서 「좋아요」를 누르면 로그인 확인 모달이 뜬다', await 확인창.글이든('로그인이 필요합니다. 로그인 화면으로 이동할까요?').isVisible(), true);
      await 확인창.버튼(확인창.창, '취소').click();
      await 확인창.닫힐때까지(확인창.창);
    });

    await test.step('게시글 상세에서 「링크 복사」를 누른다', async () => {
      await 글.링크복사.click();
      await verify('게시글 상세에서 「링크 복사」를 누르면 「링크를 복사했습니다」 토스트가 뜬다', await (await 알림.아무거나뜰때까지()).innerText(), '링크를 복사했습니다');
    });

    await test.step('게시글 상세에서 「목록」을 누른다', async () => {
      await 글.목록링크.click();
      await 목록.내용그려질때까지();
      await verify('게시글 상세에서 「목록」을 누르면 게시판 목록 화면이 보인다', await 목록.제목.isVisible(), true);
    });

    await test.step('글쓴 회원으로 로그인해 있는지 확인한다', async () => {
      await 로그인요청(page.request, 준비.글?.회원.loginId ?? '', 준비.글?.회원.password ?? '');
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.머리글.로그인꼴일때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
    });

    await test.step('게시글 상세에서 「답글」을 누른다', async () => {
      const 줄 = 글.댓글줄(댓글내용);
      await 줄.waitFor();
      await 글.답글버튼(줄).click();
      await verify('게시글 상세에서 「답글」을 누르면 답글 입력칸이 열린다', await 글.답글입력(줄).isVisible(), true);
    });

    await test.step('게시글 상세에서 「삭제」를 누른다', async () => {
      await 글.삭제버튼.click();
      await 확인창.뜰때까지(확인창.창);
      await verify('게시글 상세에서 「삭제」를 누르면 삭제 확인 모달이 뜬다', await 확인창.글이든('게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.').isVisible(), true);
      await 확인창.버튼(확인창.창, '취소').click();
      await 확인창.닫힐때까지(확인창.창);
    });

    await test.step('게시글 상세에서 「수정」을 누른다', async () => {
      await 글.수정링크.click();
      await 쓰기.그려질때까지();
      await verify('게시글 상세에서 「수정」을 누르면 게시글 수정 화면이 보인다', await 쓰기.수정제목.isVisible(), true);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(request, 준비.글);
  }
});

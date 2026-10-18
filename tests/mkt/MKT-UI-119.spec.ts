import { defineCase, test, verify } from '@platform/kit';
import { 모달 } from './components/modal.component.js';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 글제목읽기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-119',
  name: '게시글 「삭제」를 누르면 모달 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」가 뜬다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 확인창 = new 모달(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 쓴 글을 만든다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '삭제 모달 확인');
    });

    await test.step('회원이 쓴 글이 만들어졌는지 확인한다', async () => {
      await verify('쓴 글이 만들어져 있다', await 글제목읽기(page.request, 준비.글?.글번호 ?? 0), 준비.글?.제목, { blocker: true });
    });

    await test.step('자기 글 상세에서 「삭제」를 누른다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.삭제버튼.click();
      await 확인창.뜰때까지(확인창.창);
      await verify('게시글 「삭제」를 누르면 모달 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」가 뜬다', await 확인창.글이든('게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.').isVisible(), true);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

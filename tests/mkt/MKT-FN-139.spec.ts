import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 좋아요요청 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-139',
  name: '「좋아요」를 다시 누르면 좋아요 수가 누르기 전으로 돌아간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 자기 글에 좋아요를 눌러 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 쓴 글을 만들고 좋아요를 눌러 둔다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '좋아요 취소 확인');
      await 좋아요요청(page.request, 준비.글.글번호);
    });

    await test.step('쓴 글의 상세에서 좋아요를 눌러 둔 상태인지 확인한다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.머리글.로그인꼴일때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('「좋아요」가 눌려 있다', await 글.좋아요.getAttribute('aria-pressed'), 'true', { blocker: true });
    });

    await test.step('「좋아요」를 다시 누른다', async () => {
      await 글.좋아요누르기();
      await verify('「좋아요」를 다시 누르면 좋아요 수가 누르기 전으로 돌아간다', await 글.좋아요수읽기(), 0);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

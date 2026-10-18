import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 글제목읽기, 좋아요요청 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-140',
  name: '좋아요를 누른 글을 다시 열어도 좋아요 수는 한 번 누른 만큼만 올라 있다',
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
      준비.글 = await 글쓴이와글만들기(page.request, '좋아요 유지 확인');
      await 좋아요요청(page.request, 준비.글.글번호);
    });

    await test.step('좋아요를 누른 글이 만들어졌는지 확인한다', async () => {
      await verify('쓴 글이 만들어져 있다', await 글제목읽기(page.request, 준비.글?.글번호 ?? 0), 준비.글?.제목, { blocker: true });
    });

    await test.step('그 글 상세를 다시 열어 좋아요 수를 확인한다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await verify('좋아요를 누른 글을 다시 열어도 좋아요 수는 한 번 누른 만큼만 올라 있다', await 글.좋아요수읽기(), 1);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});

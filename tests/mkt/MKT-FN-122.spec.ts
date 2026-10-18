import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 댓글달기 } from './helpers/data.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-122',
  name: '댓글이 0개인 글 제목 옆에는 댓글 수가 붙지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 게시판목록화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 쓴 글을 만들고 그 제목으로 게시판 목록을 검색한다', async () => {
      준비.글 = await 글쓴이와글만들기(request, '댓글 수 확인');
      await 방해창막기(page);
      await 목록.열기();
      await 목록.검색하기(준비.글.제목);
    });

    await test.step('회원이 쓴 글이 게시판 목록에 있는지 확인한다', async () => {
      await verify('회원이 쓴 글이 한 줄 보인다', await 목록.제목행(준비.글?.제목 ?? '').count(), 1, { blocker: true });
    });

    await test.step('댓글이 없는 그 글을 게시판 목록에서 찾는다', async () => {
      const 제목칸 = await 목록.제목칸글자(준비.글?.제목 ?? '');
      await verify('댓글이 0개인 글 제목 옆에는 댓글 수가 붙지 않는다', 제목칸.replace(준비.글?.제목 ?? '', ''), '');
    });

    await test.step('그 글에 댓글 하나를 달고 게시판 목록을 다시 연다', async () => {
      await 댓글달기(request, 준비.글?.글번호 ?? 0, '댓글 수 확인용 댓글');
      await 목록.열기();
      await 목록.검색하기(준비.글?.제목 ?? '');
      const 제목칸 = await 목록.제목칸글자(준비.글?.제목 ?? '');
      await verify('댓글이 1개인 글 제목 옆에 「[1]」이 붙는다', 제목칸.replace(준비.글?.제목 ?? '', ''), '[1]');
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(request, 준비.글);
  }
});

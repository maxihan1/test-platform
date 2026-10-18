import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-135',
  name: '오늘 쓴 글의 작성일은 「14:05」처럼 시각만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 오늘 글을 하나 썼다', '비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 게시판목록화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 오늘 글을 쓰고 그 제목으로 게시판 목록을 검색한다', async () => {
      준비.글 = await 글쓴이와글만들기(request, '작성일 확인');
      await 방해창막기(page);
      await 목록.열기();
      await 목록.검색하기(준비.글.제목);
    });

    await test.step('비회원으로 열린 게시판 목록과 오늘 쓴 글을 확인한다', async () => {
      await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
      await verify('오늘 쓴 글이 한 줄 보인다', await 목록.제목행(준비.글?.제목 ?? '').count(), 1, { blocker: true });
    });

    await test.step('게시판 목록에서 오늘 쓴 글의 작성일을 확인한다', async () => {
      const 작성일 = ((await 목록.제목행(준비.글?.제목 ?? '').innerText()).split('\t')[4]) ?? '';
      await verify('오늘 쓴 글의 작성일은 「14:05」처럼 시각만 보인다', /^\d{2}:\d{2}$/.test(작성일), true);
    });

    await test.step('게시판 목록에서 어제 이전 글의 작성일을 확인한다', async () => {
      await 목록.열기();
      const 작성일 = (await 목록.공지행글자들())[0]?.[4] ?? '';
      await verify('그 전 글의 작성일은 「2026-09-20」처럼 날짜만 보인다', /^\d{4}-\d{2}-\d{2}$/.test(작성일), true);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(request, 준비.글);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-132',
  name: '검색 결과가 0건이면 표 대신 「검색 결과가 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '회원이 다른 글에 없는 제목으로 글을 하나 썼다'],
  techniques: ['경계값 분석'],
  params: z.object({
    noResultWord: z.string().describe('검색어 — 어느 글에도 없는 글자').default('zzzzzz'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 쓴 글을 만들고 게시판 목록 화면을 연다', async () => {
      준비.글 = await 글쓴이와글만들기(request, '검색 한 건');
      await 방해창막기(page);
      await 목록.열기();
    });

    await test.step('비회원으로 열린 게시판 목록과 회원이 쓴 글을 확인한다', async () => {
      await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
      await verify('게시판 목록 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    });

    await test.step('목록에 없는 검색어 「zzzzzz」로 검색한다', async () => {
      await 목록.검색하기(params.noResultWord);
      await verify('검색 결과가 0건이면 표 대신 「검색 결과가 없습니다」가 보인다', [await 목록.빈상태.innerText(), await 목록.표.isVisible()], ['검색 결과가 없습니다', false]);
    });

    await test.step('그 글 제목으로 검색한다', async () => {
      await 목록.검색하기(준비.글?.제목 ?? '');
      const 제목들 = (await 목록.일반행글자들()).map((칸) => 칸[2]);
      await verify('검색 결과가 1건이면 「검색 결과가 없습니다」 없이 그 글 한 줄이 보인다', [await 목록.빈상태.count(), 제목들.join(', ')], [0, 준비.글?.제목]);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(request, 준비.글);
  }
});

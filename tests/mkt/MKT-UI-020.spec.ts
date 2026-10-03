import { defineCase, test, verify } from '@platform/kit';

import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-020',
  name: '게시판 목록 화면에 분류 탭 · 목록 표 · 페이지 이동 · 검색 조건 · 정렬이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
    await 목록.글줄().first().waitFor();
    await verify(
      '목록 위에 분류 탭 「전체」 「자유」 「질문」 「후기」가 보인다',
      [await 목록.분류탭('전체').isVisible(), await 목록.분류탭('자유').isVisible(), await 목록.분류탭('질문').isVisible(), await 목록.분류탭('후기').isVisible()],
      [true, true, true, true],
      { blocker: true },
    );
    await verify(
      '목록 표에 번호 · 분류 · 제목 · 작성자 · 작성일 · 조회수 · 좋아요 칸 제목이 보인다',
      [
        await 목록.열머리글('번호').isVisible(),
        await 목록.열머리글('분류').isVisible(),
        await 목록.열머리글('제목').isVisible(),
        await 목록.열머리글('작성자').isVisible(),
        await 목록.열머리글('작성일').isVisible(),
        await 목록.열머리글('조회수').isVisible(),
        await 목록.열머리글('좋아요').isVisible(),
      ],
      [true, true, true, true, true, true, true],
    );
    await verify(
      '아래에 페이지 번호와 「이전」 「다음」이 보인다',
      [await 목록.쪽버튼(1).isVisible(), await 목록.이전버튼().isVisible(), await 목록.다음버튼().isVisible()],
      [true, true, true],
    );
    await verify('검색 조건 선택 상자에 「제목」 「내용」 「작성자」가 있다', await 목록.검색조건선택지().allInnerTexts(), ['제목', '내용', '작성자']);
    await verify(
      '정렬 선택 상자에 「최신순」 「조회순」 「좋아요순」이 있고 「최신순」이 기본이다',
      { 선택지: await 목록.정렬선택지().allInnerTexts(), 기본: await 목록.선택된정렬().innerText() },
      { 선택지: ['최신순', '조회순', '좋아요순'], 기본: '최신순' },
    );
  });
});

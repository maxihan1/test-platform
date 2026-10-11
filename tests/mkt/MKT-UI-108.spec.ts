import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-108',
  name: '게시판 목록 화면에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」 가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify(
      '게시판 목록 화면에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」 가 보인다',
      await 목록.탭들.allInnerTexts(),
      ['전체', '자유', '질문', '후기'],
    );
    await verify(
      '게시판 목록 표에 번호 · 분류 · 제목 · 작성자 · 작성일 · 조회수 · 좋아요 칸이 보인다',
      await 목록.표머리칸들.allInnerTexts(),
      ['번호', '분류', '제목', '작성자', '작성일', '조회수', '좋아요'],
    );
    await verify(
      '게시판 목록 아래에 페이지 번호 · 「이전」 · 「다음」 이 보인다',
      { 이전: await 목록.이전.isVisible(), 쪽번호: (await 목록.쪽번호들.count()) > 0, 다음: await 목록.다음.isVisible() },
      { 이전: true, 쪽번호: true, 다음: true },
    );
    await verify('게시판 목록 첫 페이지에서는 「이전」 이 눌리지 않는다', await 목록.이전.isEnabled(), false);
    const 날짜칸들 = (await 목록.일반행읽기()).map((행) => 행.작성일).filter((글) => !/^\d{2}:\d{2}$/.test(글));
    await verify(
      '오늘 전에 쓴 글의 작성일은 「2026-09-20」 처럼 날짜만 보인다',
      { 날짜글수: 날짜칸들.length > 0, 모두날짜꼴: 날짜칸들.every((글) => /^\d{4}-\d{2}-\d{2}$/.test(글)) },
      { 날짜글수: true, 모두날짜꼴: true },
    );
  });

  await test.step('게시판 목록 마지막 페이지를 연다', async () => {
    await 목록.쪽누르기(await 목록.마지막쪽번호());
    await verify('게시판 목록 마지막 페이지에서는 「다음」 이 눌리지 않는다', await 목록.다음.isEnabled(), false);
  });
});

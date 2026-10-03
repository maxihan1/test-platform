import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게시판목록 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-019',
  name: '게시판 목록 화면에 분류 탭 · 표 · 공지 · 쪽 번호 · 정렬이 규칙대로 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '댓글이 달린 글이 있다', '댓글이 없는 글이 있다', '공지글이 있다', '오늘 쓴 글과 그 전에 쓴 글이 있다'],
  params: z.object({
    commentedTitle: z.string().min(1).describe('댓글이 달린 글 제목').default('데모 니트 사이즈 후기'),
    uncommentedTitle: z.string().min(1).describe('댓글이 없는 글 제목').default('백팩 실사용 후기 3'),
  }),
  expected: z.object({
    tabs: z.string().describe('분류 탭 이름').default('전체, 자유, 질문, 후기'),
    columns: z.string().describe('표 머리 칸 이름').default('번호, 분류, 제목, 작성자, 작성일, 조회수, 좋아요'),
    commentCount: z.string().describe('댓글이 달린 글의 댓글 수 표기').default('[3]'),
    noticeMark: z.string().describe('첫 줄의 공지 표시').default('공지'),
    sorts: z.string().describe('정렬 항목 이름').default('최신순, 조회순, 좋아요순'),
    defaultSort: z.string().describe('정렬 기본값').default('최신순'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 목록 = new 게시판목록(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 목록.열기();
    await 목록.줄이뜰때까지();
    await verify('목록 위에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」가 보인다', (await 목록.분류탭들.allInnerTexts()).join(', '), expected.tabs);
    await verify(
      '목록은 번호 · 분류 · 제목 · 작성자 · 작성일 · 조회수 · 좋아요 칸을 가진 표로 보인다',
      (await 목록.머리칸.allInnerTexts()).join(', '),
      expected.columns,
    );
    await verify('댓글이 있는 글은 제목 옆에 댓글 수가 「[3]」처럼 붙어 보인다', await 목록.댓글수(params.commentedTitle).innerText(), expected.commentCount);
    await verify('댓글이 0개인 글은 제목 옆에 댓글 수가 붙지 않는다', await 목록.댓글수(params.uncommentedTitle).count(), 0);
    await verify('공지글은 목록 맨 위에 「공지」 표시와 함께 보인다', (await 목록.첫줄공지표시.allInnerTexts()).join(', '), expected.noticeMark);
    await verify(
      '목록 아래에 페이지 번호 · 「이전」 · 「다음」이 보인다',
      [(await 목록.쪽번호들.count()) > 0, await 목록.이전.isVisible(), await 목록.다음.isVisible()].join(', '),
      'true, true, true',
    );
    await verify('정렬 드롭다운에 「최신순」 · 「조회순」 · 「좋아요순」이 있다', (await 목록.정렬항목.allInnerTexts()).join(', '), expected.sorts);
    await verify('정렬 드롭다운의 기본값은 「최신순」이다', await 목록.정렬선택.innerText(), expected.defaultSort);

    const 날짜들 = await 목록.작성일칸들.allInnerTexts();
    const 오늘 = await page.evaluate(() => new Date().toLocaleDateString('sv-SE'));
    await verify('오늘 쓴 글의 작성일은 「14:05」처럼 시각만 보인다', 날짜들.some((d) => /^\d{2}:\d{2}$/.test(d)), true);
    await verify(
      '오늘 이전에 쓴 글의 작성일은 「2026-09-20」처럼 날짜만 보인다',
      날짜들.some((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) && !날짜들.includes(오늘),
      true,
    );
  });
});

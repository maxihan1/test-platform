import type { Locator } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게시판목록 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-065',
  name: '게시판 분류 · 정렬 · 쪽 번호를 바꾸면 목록이 규칙대로 바뀌고 주소에 남는다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '게시판 목록의 첫 페이지다', '게시판 목록의 마지막 페이지다', '분류와 페이지를 고른 목록이다'],
  params: z.object({
    questionTab: z.string().min(1).describe('질문 분류 탭').default('질문'),
    freeTab: z.string().min(1).describe('자유 분류 탭').default('자유'),
    searchField: z.string().min(1).describe('검색 조건').default('내용'),
    keyword: z.string().min(1).describe('검색어').default('입니다'),
  }),
  expected: z.object({
    questionOnly: z.string().describe('질문 탭에 보이는 분류').default('질문'),
    noticePinned: z.string().describe('공지 표시와 공지 줄 수').default('공지, 2'),
    urlState: z.string().describe('주소에 남는 분류 · 검색 조건 · 검색어 · 정렬 · 쪽').default('자유,content,입니다,likes,2'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 목록 = new 게시판목록(page);
  const 숫자들 = async (칸: Locator): Promise<number[]> =>
    (await 칸.allInnerTexts()).map((t) => Number(t.replace(/,/g, '')));
  const 내림차순인가 = (값들: number[]): boolean => 값들.length > 1 && 값들.every((n, i) => i === 0 || 값들[i - 1] >= n);
  const 제목들 = async (): Promise<string> => (await 목록.일반제목들.allInnerTexts()).sort().join(' | ');
  const 주소상태 = (): string => {
    const q = new URL(page.url()).searchParams;
    return ['category', 'field', 'q', 'sort', 'page'].map((k) => q.get(k)).join(',');
  };

  await test.step('게시판 목록 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 목록.열기();
    await 목록.줄이뜰때까지();
  });

  await test.step('분류 탭 「질문」을 누른다', async () => {
    await 목록.분류탭(params.questionTab).click();
    await 목록.분류칸들.first().filter({ hasText: params.questionTab }).waitFor();
    await verify(
      '분류 탭 「질문」을 누르면 분류가 「질문」인 글만 보인다',
      [...new Set(await 목록.분류칸들.allInnerTexts())].join(', '),
      expected.questionOnly,
    );
  });

  await test.step('분류 탭 「자유」를 누른다', async () => {
    await 목록.분류탭(params.freeTab).click();
    await 목록.분류칸들.first().filter({ hasText: params.freeTab }).waitFor();
    await verify(
      '분류 탭을 눌러도 공지글은 분류와 상관없이 목록 맨 위에 고정돼 있다',
      [(await 목록.첫줄공지표시.allInnerTexts()).join(', '), await 목록.공지줄.count()].join(', '),
      expected.noticePinned,
    );
  });

  await test.step('페이지 번호 줄에서 「이전」을 확인한다', async () => {
    await 목록.이전.waitFor();
    await verify('첫 페이지에서는 「이전」이 눌리지 않는다', await 목록.이전.isDisabled(), true);
  });

  await test.step('페이지 번호 줄에서 「다음」을 확인한다', async () => {
    const 마지막 = await 목록.마지막쪽번호.innerText();
    await 목록.마지막쪽번호.click();
    await 목록.현재쪽.filter({ hasText: 마지막 }).waitFor();
    await verify('마지막 페이지에서는 「다음」이 눌리지 않는다', await 목록.다음.isDisabled(), true);
  });

  await test.step('정렬 드롭다운에서 「조회순」을 고른다', async () => {
    await 목록.정렬.selectOption({ label: '조회순' });
    await 목록.불러오기끝();
    await verify('정렬을 「조회순」으로 바꾸면 조회수가 많은 글이 먼저 보인다', 내림차순인가(await 숫자들(목록.조회수칸들)), true);
  });

  await test.step('정렬 드롭다운에서 「좋아요순」을 고른다', async () => {
    await 목록.정렬.selectOption({ label: '좋아요순' });
    await 목록.불러오기끝();
    await verify('정렬을 「좋아요순」으로 바꾸면 좋아요가 많은 글이 먼저 보인다', 내림차순인가(await 숫자들(목록.좋아요칸들)), true);
  });

  await test.step('분류 탭 · 검색어 · 정렬 · 페이지를 차례로 고른다', async () => {
    await 목록.분류탭(params.freeTab).click();
    await 목록.검색조건.selectOption({ label: params.searchField });
    await 목록.검색한다(params.keyword);
    await 목록.불러오기끝();
    await 목록.정렬.selectOption({ label: '좋아요순' });
    await 목록.불러오기끝();
    await 목록.쪽번호(2).click();
    await 목록.현재쪽.filter({ hasText: '2' }).waitFor();
    await verify('분류 · 검색 · 정렬 · 페이지는 주소창에 남는다', 주소상태(), expected.urlState);
  });

  await test.step('화면을 새로 고치고 다른 화면에 갔다가 뒤로 가기를 한다', async () => {
    const 전 = await 제목들();
    await page.reload();
    await 목록.줄이뜰때까지();
    const 새로고침 = await 제목들();
    await page.goto('/support');
    await page.goBack();
    await 목록.줄이뜰때까지();
    const 뒤로가기 = await 제목들();
    await verify('새로 고치거나 뒤로 가기를 해도 같은 목록이 보인다', [새로고침 === 전, 뒤로가기 === 전].join(', '), 'true, true');
  });
});

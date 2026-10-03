import { defineCase, test, verify } from '@platform/kit';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

type 글요약 = { views: number; likes: number };

export const spec = defineCase({
  tcId: 'MKT-FN-046',
  name: '정렬을 바꾸면 조회수 · 좋아요가 큰 글이 먼저 보이고 분류 · 정렬 · 페이지는 주소창에 남는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

const 큰순 = (값들: number[]): number[] => [...값들].sort((앞, 뒤) => 뒤 - 앞).slice(0, 10);

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 상세 = new 게시글상세화면(page);
  const 전체 = (await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[];
  let 새로고침전: string[] = [];
  let 새로고침후: string[] = [];

  await test.step('정렬을 「조회순」으로 바꾼다', async () => {
    await 목록.열기();
    await 목록.글줄().first().waitFor();
    await 목록.정렬고르기('조회순');
    await 목록.글줄().first().waitFor();
    await verify(
      '「조회순」을 고르면 조회수가 큰 글이 먼저 보인다',
      (await 목록.조회수칸(목록.일반글줄()).allInnerTexts()).map(Number),
      큰순(전체.map((글) => 글.views)),
    );
  });

  await test.step('정렬을 「좋아요순」으로 바꾼다', async () => {
    await 목록.정렬고르기('좋아요순');
    await 목록.글줄().first().waitFor();
    await verify(
      '「좋아요순」을 고르면 좋아요가 많은 글이 먼저 보인다',
      (await 목록.좋아요칸(목록.일반글줄()).allInnerTexts()).map(Number),
      큰순(전체.map((글) => 글.likes)),
    );
  });

  await test.step('분류 · 정렬 · 페이지를 바꾼 뒤 화면을 새로 고친다', async () => {
    await new 쿠키띠(page).동의하기();
    await 목록.분류고르기('자유');
    await 목록.글줄().first().waitFor();
    await 목록.쪽버튼(2).click();
    await 목록.글줄().first().waitFor();
    새로고침전 = await 목록.제목칸(목록.일반글줄()).allInnerTexts();
    await page.reload();
    await 목록.쪽버튼(2).waitFor();
    await 목록.글줄().first().waitFor();
    새로고침후 = await 목록.제목칸(목록.일반글줄()).allInnerTexts();
    const 쿼리 = new URL(page.url()).searchParams;
    await verify(
      '분류 · 정렬 · 페이지는 주소창에 남는다',
      { 분류: 쿼리.get('category'), 정렬: 쿼리.get('sort'), 페이지: 쿼리.get('page') },
      { 분류: '자유', 정렬: 'likes', 페이지: '2' },
    );
  });

  await test.step('분류 · 정렬 · 페이지를 바꾼 뒤 상세에 들어갔다 뒤로 간다', async () => {
    await 목록.첫글열기();
    await 상세.제목().waitFor();
    await page.goBack();
    await 목록.쪽버튼(2).waitFor();
    await 목록.글줄().first().waitFor();
    await verify(
      '새로 고치거나 뒤로 가기를 해도 같은 목록이 보인다',
      [새로고침후, await 목록.제목칸(목록.일반글줄()).allInnerTexts()],
      [새로고침전, 새로고침전],
    );
  });
});

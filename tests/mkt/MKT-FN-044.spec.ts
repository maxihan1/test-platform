import { defineCase, test, verify } from '@platform/kit';

import { 게시판목록화면 } from './pages/board-list.page.js';

type 글요약 = { title: string };

export const spec = defineCase({
  tcId: 'MKT-FN-044',
  name: '제목 검색을 하면 그 낱말이 든 글만 보이고 결과가 없으면 「검색 결과가 없습니다」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 전체 = (await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[];
  const 낱말 = 전체[전체.length - 1]?.title.split(' ').find((조각) => 조각.length >= 2) ?? '';
  const 일치수 = 전체.filter((글) => 글.title.includes(낱말)).length;
  const 없는낱말 = `zq${Date.now().toString(36)}`;

  await test.step('검색 조건 「제목」을 고르고 목록 제목에 든 낱말을 검색한다', async () => {
    await 목록.열기();
    await 목록.글줄().first().waitFor();
    await 목록.검색하기('제목', 낱말);
    await 목록.글줄().first().waitFor();
    await verify(
      '제목 검색을 하면 그 낱말이 제목에 든 글만 보인다',
      (await 목록.제목칸(목록.일반글줄()).allInnerTexts()).map((제목) => 제목.includes(낱말)),
      Array<boolean>(Math.min(10, 일치수)).fill(true),
    );
  });

  await test.step('어느 글에도 없는 낱말을 검색한다', async () => {
    await 목록.검색하기('제목', 없는낱말);
    await 목록.이전버튼().waitFor({ state: 'detached' });
    await verify(
      '검색 결과가 없으면 표 대신 「검색 결과가 없습니다」가 보인다',
      [await 목록.검색결과없음문구().isVisible(), await 목록.표().count()],
      [true, 0],
    );
  });
});

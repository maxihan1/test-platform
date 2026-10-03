import { defineCase, test, verify } from '@platform/kit';

import { 게시판목록화면 } from './pages/board-list.page.js';

type 글요약 = { id: number; category: string; title: string };

export const spec = defineCase({
  tcId: 'MKT-FN-041',
  name: '분류 탭 「질문」을 누르면 질문 분류 글만 보이고 공지글은 목록 맨 위에 남는다',
  precondition: ['비회원이다', '공지글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 응답 = await (await page.request.get('/api/posts?size=100')).json();
  const 공지수: number = (응답.notices as 글요약[]).length;
  const 질문글수 = (응답.items as 글요약[]).filter((글) => 글.category === '질문').length;

  await test.step('분류 탭 「질문」을 누른다', async () => {
    await 목록.열기();
    await 목록.글줄().first().waitFor();
    await verify('공지글이 있다', 공지수 > 0 && (await 목록.공지줄().count()) > 0, true, { blocker: true });
    await 목록.분류고르기('질문');
    await 목록.글줄().first().waitFor();
    await verify(
      '분류 탭 「질문」을 누르면 질문 분류 글만 보인다',
      await 목록.분류칸(목록.일반글줄()).allInnerTexts(),
      Array<string>(Math.min(10, 질문글수)).fill('질문'),
    );
  });

  await test.step('분류 탭 「자유」를 누른다', async () => {
    await 목록.분류고르기('자유');
    await 목록.글줄().first().waitFor();
    const 맨위 = (await 목록.글줄().allInnerTexts()).slice(0, 공지수);
    await verify(
      '공지글은 분류 탭과 상관없이 목록 맨 위에 「공지」 표시와 함께 보인다',
      { 공지줄: await 목록.공지줄().count(), 맨위가공지: 맨위.every((글자) => 글자.includes('공지')) },
      { 공지줄: 공지수, 맨위가공지: true },
    );
  });
});

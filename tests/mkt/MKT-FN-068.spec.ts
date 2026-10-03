import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게시글상세 } from './pages/board-detail.page.js';
import { 게시판목록 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-068',
  name: '게시글 상세를 열 때마다 조회수가 1 오르고 「목록」 버튼은 들어오기 전 목록으로 돌아간다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '게시글 상세 화면이 열려 있다', '분류 · 검색 · 페이지를 고른 목록에서 글 상세로 들어왔다'],
  params: z.object({
    listQuery: z.string().min(1).describe('고른 목록 주소의 쿼리').default('?category=자유&field=content&q=입니다&page=2'),
  }),
  expected: z.object({
    viewIncrease: z.number().describe('다시 열 때 늘어나는 조회수').default(1),
    listState: z.string().describe('돌아간 목록의 분류 · 검색 조건 · 검색어 · 쪽').default('자유,content,입니다,2'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 목록 = new 게시판목록(page);
  const 상세 = new 게시글상세(page);
  const 조회수값 = async (): Promise<number> => Number((await 상세.조회수.innerText()).replace(/\D/g, ''));

  await test.step('고른 목록에서 글 상세로 들어간다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 목록.열기(params.listQuery);
    await 목록.줄이뜰때까지();
    await 목록.일반제목들.first().click();
    await 상세.제목.waitFor();
  });

  await test.step('상세를 연 뒤 같은 상세를 다시 연다', async () => {
    const 처음 = await 조회수값();
    await page.goto(page.url());
    await 상세.제목.waitFor();
    await verify('상세를 열 때마다 조회수가 1 오른다', (await 조회수값()) - 처음, expected.viewIncrease);
  });

  await test.step('상세 아래 「목록」 버튼을 누른다', async () => {
    await 상세.목록.click();
    await 목록.줄이뜰때까지();
    const q = new URL(page.url()).searchParams;
    await verify(
      '「목록」 버튼을 누르면 들어오기 전의 목록(분류 · 검색 · 페이지 유지)으로 돌아간다',
      ['category', 'field', 'q', 'page'].map((k) => q.get(k)).join(','),
      expected.listState,
    );
  });
});

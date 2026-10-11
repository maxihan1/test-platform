import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-097',
  name: '「자유」 탭을 누르면 주소창에 분류 값이 남는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 주소값 = (이름: string): string | null => new URL(page.url()).searchParams.get(이름);
  await 방해막기(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 「자유」 탭을 누른다', async () => {
    await 목록.분류탭('자유').click();
    await 목록.그려질때까지();
    await verify('「자유」 탭을 누르면 주소창에 분류 값이 남는다', 주소값('category'), '자유');
  });

  await test.step('게시판 목록에서 「제목」 조건으로 「데모」를 검색한다', async () => {
    await 목록.열기();
    await 목록.그려질때까지();
    await 목록.검색하기('제목', '데모');
    await 목록.그려질때까지();
    await verify('검색하면 주소창에 검색 조건과 검색어가 남는다', 주소값('field') === 'title' && 주소값('q') === '데모', true);
  });

  await test.step('정렬 드롭다운에서 「조회순」을 고른다', async () => {
    await 목록.열기();
    await 목록.그려질때까지();
    await 목록.정렬고르기('조회순');
    await 목록.그려질때까지();
    await verify('정렬을 바꾸면 주소창에 정렬 값이 남는다', 주소값('sort'), 'views');
  });

  await test.step('게시판 목록 아래 페이지 「2」를 누른다', async () => {
    await 목록.열기();
    await 목록.그려질때까지();
    await 목록.번호버튼(2).click();
    await 목록.그려질때까지();
    await verify('다른 페이지로 가면 주소창에 페이지 값이 남는다', 주소값('page'), '2');
  });
});

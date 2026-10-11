import { defineCase, test, verify } from '@platform/kit';

import { 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 표식 } from './helpers/board.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-095',
  name: '맞는 글이 없는 검색어로 검색하면 표 대신 「검색 결과가 없습니다」가 보인다',
  precondition: ['비회원이다', '회원이 쓴 글이 하나 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 글번호 = 0;
  let 제목 = '';
  await 방해막기(page);

  try {
    await test.step('회원이 글을 하나 쓴다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      const 글 = await 글하나쓰기(글쓴.api, '검색글');
      글번호 = 글.id;
      제목 = 글.제목;
    });

    await test.step('회원이 쓴 글이 있는지 확인한다', async () => {
      await verify('회원이 쓴 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('게시판 목록 화면을 연다', async () => {
      await 목록.열기();
    });

    await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
      await 목록.그려질때까지();
      await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
    });

    await test.step('어느 글에도 없는 검색어로 검색한다', async () => {
      await 목록.검색하기('제목', 표식('없는말'));
      await 목록.그려질때까지();
      await verify('맞는 글이 없는 검색어로 검색하면 표 대신 「검색 결과가 없습니다」가 보인다', (await 목록.결과없음.isVisible()) && (await 목록.표.count()) === 0, true);
    });

    await test.step('그 글 제목에만 있는 낱말로 검색한다', async () => {
      await 목록.검색하기('제목', 제목);
      await 목록.제목링크(제목).waitFor();
      await verify('맞는 글이 하나인 검색어로 검색하면 「검색 결과가 없습니다」 없이 그 글이 보인다', !(await 목록.결과없음.isVisible()) && (await 목록.제목링크(제목).isVisible()), true);
    });
  } finally {
    await 정리.모두하기();
  }
});

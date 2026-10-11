import { defineCase, test, verify } from '@platform/kit';

import { 표식 } from './helpers/board.helper.js';
import { 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-093',
  name: '검색 조건 「제목」으로 검색하면 제목에 검색어가 든 글만 보인다',
  precondition: ['회원이 쓴 글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 정리 = 정리함만들기();
  const 본문낱말 = 표식('본문낱말');
  let 글쓴!: 둘째회원;
  let 글번호 = 0;
  let 제목 = '';
  await 방해막기(page);

  try {
    await test.step('회원이 글을 하나 쓴다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      const 글 = await 글하나쓰기(글쓴.api, '검색글', { content: `${본문낱말} 이 낱말은 본문에만 있습니다` });
      글번호 = 글.id;
      제목 = 글.제목;
    });

    await test.step('회원이 쓴 글이 있는지 확인한다', async () => {
      await verify('회원이 쓴 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('검색 조건 「제목」을 고르고 그 글 제목의 낱말로 검색한다', async () => {
      await 목록.열기();
      await 목록.그려질때까지();
      await 목록.검색하기('제목', 제목);
      await 목록.그려질때까지();
      const 제목들 = (await 목록.일반행들()).map((행) => 행.제목);
      await verify('검색 조건 「제목」으로 검색하면 제목에 검색어가 든 글만 보인다', 제목들.length > 0 && 제목들.every((글) => 글.includes(제목)), true);
    });

    await test.step('검색 조건 「내용」을 고르고 그 글 본문의 낱말로 검색한다', async () => {
      await 목록.검색하기('내용', 본문낱말);
      await 목록.그려질때까지();
      const 제목들 = (await 목록.일반행들()).map((행) => 행.제목);
      await verify('검색 조건 「내용」으로 검색하면 본문에 검색어가 든 글만 보인다', 제목들.join(' | '), 제목);
    });

    await test.step('검색 조건 「작성자」를 고르고 회원 이름으로 검색한다', async () => {
      await 목록.검색하기('작성자', 글쓴.정보.name);
      await 목록.그려질때까지();
      const 행들 = await 목록.일반행들();
      await verify('검색 조건 「작성자」로 검색하면 그 회원이 쓴 글만 보인다', 행들.length > 0 && 행들.every((행) => 행.작성자 === 글쓴.정보.name) && 행들.some((행) => 행.제목 === 제목), true);
    });
  } finally {
    await 정리.모두하기();
  }
});

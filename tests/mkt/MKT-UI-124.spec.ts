import { defineCase, test, verify } from '@platform/kit';

import { 그림주소, 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-124',
  name: '게시글 상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문이 보인다',
  precondition: ['비회원이다', '회원이 이미지를 붙인 글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('회원이 이미지를 붙인 글을 쓴다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '그림글', { images: [그림주소()] })).id;
    });

    await test.step('이미지를 붙인 글이 있는지 확인한다', async () => {
      await verify('회원이 이미지를 붙인 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('게시판 목록에서 글 하나를 연다', async () => {
      await 목록.열기();
      await 목록.그려질때까지();
      await 목록.첫글열기();
      await 상세.그려질때까지();
      const 글정보 = await 상세.글정보.innerText();
      const 칸이다있다 = ['분류', '작성자', '작성일', '조회수'].every((칸) => 글정보.includes(칸));
      await verify('게시글 상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문이 보인다', (await 상세.제목.isVisible()) && 칸이다있다 && (await 상세.본문.isVisible()), true);
    });

    await test.step('이미지를 붙인 글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await 상세.그려질때까지();
      await verify('이미지를 붙인 글 상세에 첨부 이미지가 보인다', await 상세.첨부이미지.first().isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-130',
  name: '댓글 두 개가 달린 글 상세에 「댓글 2」 제목이 보인다',
  precondition: ['댓글 두 개가 달린 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 첫째 = '먼저 단 댓글';
  const 둘째 = '나중에 단 댓글';
  let 글쓴!: 둘째회원;
  let 글번호 = 0;

  try {
    await test.step('회원이 글을 쓰고 댓글 두 개를 차례로 단다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '댓글글')).id;
      await 댓글달기(글쓴.api, 글번호, 첫째);
      await 댓글달기(글쓴.api, 글번호, 둘째);
    });

    await test.step('댓글 두 개가 달린 글이 있는지 확인한다', async () => {
      await verify('댓글 두 개가 달린 글이 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('그 글 상세를 연다', async () => {
      await 방해막기(page);
      await 상세.열기(글번호);
      await 상세.댓글까지그려질때까지();
      await 상세.댓글(둘째).waitFor();
      await verify('댓글 두 개가 달린 글 상세에 「댓글 2」 제목이 보인다', await 상세.댓글제목.innerText(), '댓글 2');
      await verify('댓글 목록은 먼저 단 댓글이 위에 보인다', (await 상세.댓글내용들()).join(' | '), `${첫째} | ${둘째}`);
    });
  } finally {
    await 정리.모두하기();
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글있나, 글하나쓰기, 아래에있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-107',
  name: '「답글」을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다',
  precondition: ['댓글이 달린 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 내용 = '답글을 받을 댓글';
  let 나!: 글쓴이;
  let 글번호 = 0;

  await 방해막기(page);
  try {
    await test.step('회원으로 로그인해 글을 쓰고 댓글을 하나 단다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '댓글글')).id;
      await 댓글달기(나.api, 글번호, 내용);
    });

    await test.step('댓글이 달린 글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글(내용).waitFor();
      await verify('댓글이 달린 글이 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('회원으로 로그인해 댓글의 「답글」을 누른다', async () => {
      await 상세.댓글답글버튼(내용).click();
      await 상세.답글입력(내용).waitFor();
      await verify('「답글」을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다', await 아래에있나(상세.댓글(내용).getByRole('paragraph').first(), 상세.답글입력(내용)), true);
    });
  } finally {
    await 정리.모두하기();
  }
});

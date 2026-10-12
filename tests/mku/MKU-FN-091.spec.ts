import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-091',
  name: '댓글이 없는 글은 목록 제목 옆에 댓글 수가 붙지 않는다',
  precondition: ['회원이 댓글 없는 글을 하나 썼다', '회원이 쓴 글에 댓글이 하나 달려 있다'],
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
      const 글 = await 글하나쓰기(글쓴.api, '댓글수글');
      글번호 = 글.id;
      제목 = 글.제목;
    });

    await test.step('회원이 쓴 글이 있는지 확인한다', async () => {
      await verify('회원이 쓴 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('게시판 목록에서 댓글 없는 그 글을 찾는다', async () => {
      await 목록.열기({ q: 제목 });
      await 목록.제목링크(제목).waitFor();
      await verify('댓글이 없는 글은 목록 제목 옆에 댓글 수가 붙지 않는다', await 목록.댓글수표시(제목).count(), 0);
    });

    await test.step('그 글에 댓글을 하나 달고 게시판 목록에서 다시 찾는다', async () => {
      await 댓글달기(글쓴.api, 글번호, '댓글 수를 볼 댓글');
      await 목록.열기({ q: 제목 });
      await 목록.제목링크(제목).waitFor();
      await verify('댓글이 하나 달린 글은 목록 제목 옆에 「[1]」이 붙는다', await 목록.댓글수표시(제목).innerText(), '[1]');
    });
  } finally {
    await 정리.모두하기();
  }
});

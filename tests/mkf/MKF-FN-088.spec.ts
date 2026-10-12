import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-088',
  name: '댓글이 0개인 글 제목 옆에는 댓글 수가 붙지 않는다',
  precondition: ['댓글이 없는 글을 쓴 회원이 있다', '댓글 1개가 달린 글을 쓴 회원이 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 댓글없는글 = { id: 0, 제목: '' };
  let 댓글하나글 = { id: 0, 제목: '' };

  try {
    await test.step('회원이 댓글 없는 글과 댓글 1개가 달린 글을 쓴다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      const 없는글 = await 글하나쓰기(글쓴.api, '댓글수0글');
      댓글없는글 = { id: 없는글.id, 제목: 없는글.제목 };
      const 하나글 = await 글하나쓰기(글쓴.api, '댓글수1글');
      댓글하나글 = { id: 하나글.id, 제목: 하나글.제목 };
      await 댓글달기(글쓴.api, 하나글.id, '댓글 수를 볼 댓글');
    });

    await test.step('보는 사람은 비회원이고 회원이 쓴 글이 있는지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
      await verify('댓글이 없는 글을 쓴 회원이 있다', await 글있나(page.request, 댓글없는글.id), true, { blocker: true });
      await verify('댓글 1개가 달린 글을 쓴 회원이 있다', await 글있나(page.request, 댓글하나글.id), true, { blocker: true });
    });

    await test.step('게시판 목록에서 그 글 줄을 찾는다', async () => {
      await 방해막기(page);
      await 목록.열기({ q: 댓글없는글.제목 });
      await 목록.제목링크(댓글없는글.제목).waitFor();
      await verify('댓글이 0개인 글 제목 옆에는 댓글 수가 붙지 않는다', await 목록.댓글수표시(댓글없는글.제목).count(), 0);
    });

    await test.step('게시판 목록에서 댓글이 1개인 글 줄을 찾는다', async () => {
      await 목록.열기({ q: 댓글하나글.제목 });
      await 목록.제목링크(댓글하나글.제목).waitFor();
      await verify('댓글이 1개인 글 제목 옆에 「[1]」이 붙는다', await 목록.댓글수표시(댓글하나글.제목).innerText(), '[1]');
    });
  } finally {
    await 정리.모두하기();
  }
});

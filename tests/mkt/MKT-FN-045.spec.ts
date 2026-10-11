import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 댓글달기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-045',
  name: '댓글이 0개인 글 제목 옆에는 댓글 수가 붙지 않는다',
  platforms: ['desktop'],
  precondition: ['회원이 직접 쓴 글이 하나 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 제목 = 고유제목(spec.tcId, '댓글 경계');
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 글을 하나 만든다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 제목 });
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('댓글이 없는 내 글을 게시판 목록에서 찾는다', async () => {
      await 목록.열기();
      await 목록.행(제목).waitFor();
      await verify('방금 만든 글이 목록에 한 줄 보인다', await 목록.행(제목).count(), 1, { blocker: true });
      await verify('댓글이 0개인 글 제목 옆에는 댓글 수가 붙지 않는다', await 목록.댓글수표시(목록.행(제목)).count(), 0);
    });

    await test.step('내 글에 댓글 하나를 달고 게시판 목록을 다시 연다', async () => {
      await 댓글달기(page.request, 글번호, '댓글 하나');
      await 목록.열기();
      await 목록.행(제목).waitFor();
      await verify('댓글이 1개인 글 제목 옆에는 「[1]」 이 붙는다', await 목록.댓글수표시(목록.행(제목)).innerText(), '[1]');
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});

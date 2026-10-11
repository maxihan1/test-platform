import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 댓글달기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-061',
  name: '답글이 없는 댓글을 지우면 댓글 목록에서 사라진다',
  platforms: ['desktop'],
  precondition: ['회원이 단 댓글이 있는 글이다', '회원이 단 댓글에 답글이 하나 달려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;
  let 답글없는댓글 = 0;
  let 답글있는댓글 = 0;

  try {
    await test.step('회원으로 로그인해 댓글 둘과 답글 하나가 달린 글을 만들고 연다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 고유제목(spec.tcId, '댓글 지우기') });
      답글없는댓글 = await 댓글달기(page.request, 글번호, '답글이 없는 댓글');
      답글있는댓글 = await 댓글달기(page.request, 글번호, '답글이 하나인 댓글');
      await 댓글달기(page.request, 글번호, '달아 둔 답글', 답글있는댓글);
      await 상세.열기(글번호);
      await 상세.댓글불러오기기다리기();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('댓글 둘과 답글 하나가 보인다', await 상세.댓글줄들.count(), 3, { blocker: true });
    });

    await test.step('답글이 없는 내 댓글을 지운다', async () => {
      await 상세.댓글삭제버튼(상세.댓글(답글없는댓글)).click();
      await 상세.댓글제목.filter({ hasText: '댓글 2' }).waitFor();
      await verify('답글이 없는 댓글을 지우면 댓글 목록에서 사라진다', await 상세.댓글(답글없는댓글).count(), 0);
    });

    await test.step('답글이 하나인 내 댓글을 지운다', async () => {
      await 상세.댓글삭제버튼(상세.댓글(답글있는댓글)).click();
      await 상세.댓글제목.filter({ hasText: '댓글 1' }).waitFor();
      await verify('답글이 하나인 댓글을 지우면 「삭제된 댓글입니다」 자리가 남는다', await 상세.댓글본문(상세.댓글(답글있는댓글)).innerText(), '삭제된 댓글입니다');
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});

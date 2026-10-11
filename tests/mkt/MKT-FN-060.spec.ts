import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 댓글달기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-060',
  name: '답글에는 「답글」 버튼이 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['회원이 단 댓글에 답글이 달려 있다'],
  techniques: ['동등 분할', '상태 전이'],
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
  let 댓글번호 = 0;
  let 답글번호 = 0;

  try {
    await test.step('회원으로 로그인해 댓글과 답글이 달린 글을 만들고 연다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 고유제목(spec.tcId, '답글') });
      댓글번호 = await 댓글달기(page.request, 글번호, '답글이 달릴 댓글');
      답글번호 = await 댓글달기(page.request, 글번호, '달아 둔 답글', 댓글번호);
      await 상세.열기(글번호);
      await 상세.댓글불러오기기다리기();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('댓글과 답글이 모두 보인다', await 상세.댓글줄들.count(), 2, { blocker: true });
    });

    await test.step('답글을 확인한다', async () => {
      await verify('답글에는 「답글」 버튼이 보이지 않는다', await 상세.답글버튼(상세.댓글(답글번호)).isVisible(), false);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});

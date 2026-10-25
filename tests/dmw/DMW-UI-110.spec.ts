import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-110',
  name: '댓글의 「답글」을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 댓글이 달린 게시글 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(request);
      글번호 = 글.번호;
      await 댓글달기(request, 글번호, '답글을 달아 볼 댓글입니다');
      await 계정으로로그인(page, params.loginId, params.loginPassword);
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await 머리.그려질때까지();
      await verify('회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('댓글이 하나 보인다', await 상세.댓글줄들.count(), 1, { blocker: true });
    });

    await test.step('댓글의 「답글」을 누른다', async () => {
      const 줄 = 상세.댓글줄('답글을 달아 볼 댓글입니다');
      await 상세.답글버튼(줄).click();
      await verify('댓글의 「답글」을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다', await 상세.답글칸(줄).isVisible(), true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});

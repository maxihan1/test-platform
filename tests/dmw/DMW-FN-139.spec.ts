import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 글자 } from './helpers/common-tools.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-139',
  name: '댓글 칸에 5자를 적으면 글자 수 「5/300」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
    적을글자수: z.number().int().describe('댓글 칸에 적을 글자 수 — 1자 이상 300자 이하').default(5),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 게시글 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(request);
      글번호 = 글.번호;
      await 계정으로로그인(page, params.loginId, params.loginPassword);
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await 머리.그려질때까지();
      await verify('회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('댓글 입력칸이 보인다', await 상세.새댓글칸.isVisible(), true, { blocker: true });
    });

    await test.step('댓글 칸에 5자를 적는다', async () => {
      await 상세.새댓글칸.fill(글자(params.적을글자수));
      await verify('댓글 칸에 5자를 적으면 글자 수 「5/300」이 보인다', await 상세.새댓글글자수.innerText(), `${params.적을글자수}/300`);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 글만들기, 댓글만들기, 정리함, 회원마당열기, type 만든글 } from './helpers/board-flow.helper.js';
import { 커뮤니티글화면 } from './pages/community-post.page.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-147',
  name: '게시판 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '관리자 계정으로 로그인해 있고 일회용 회원이 쓴 글이 있다',
    '관리자 계정으로 로그인해 있고 일회용 회원 글에 댓글 두 개가 있다',
    '관리자 계정으로 로그인해 있다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 정리 = new 정리함();
  const 화면 = new 운영게시판화면(page);
  const 틀 = new 운영틀(page);
  let 글: 만든글;
  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    });

    await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
      await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('일회용 회원이 글을 쓰고 댓글 두 개를 단다', async () => {
      const 마당 = await 회원마당열기(page, request, 정리);
      글 = await 글만들기(마당, page, 정리);
      await 댓글만들기(마당, 글.id, '시험 댓글 하나');
      await 댓글만들기(마당, 글.id, '시험 댓글 둘');
    });

    await test.step('게시판 화면에서 그 글 줄을 확인한다', async () => {
      await 화면.열기();
      await verify('그 글 줄에 「댓글 2」가 보인다', await 화면.줄버튼(글.title, '댓글 2').isVisible(), true, { blocker: true });
    });

    await test.step('보이는 글의 제목을 누른다', async () => {
      const 새탭 = await 화면.제목누르기(글.title);
      const 상세 = new 커뮤니티글화면(새탭);
      await 상세.제목.waitFor();
      await verify('게시판 화면에서 보이는 글 제목을 누르면 커뮤니티 상세가 새 탭으로 열린다', new URL(새탭.url()).pathname, `/board/${글.id}`);
      await 새탭.close();
    });

    await test.step('그 글 줄의 「댓글 2」를 누른다', async () => {
      await 화면.댓글창열기(글.title, 2);
      const 창 = await verify('댓글 목록 창이 보인다', await 화면.창.isVisible(), true);
      const 줄수 = await 화면.댓글줄들.count();
      const 숨기기수 = await 화면.댓글창숨기기들.count();
      const 줄마다 = await verify('댓글 줄마다 「숨기기」가 있다', 숨기기수 === 줄수 && 줄수 === 2, true);
      await verify('게시판 화면에서 「댓글 N」을 누르면 줄마다 「숨기기」가 있는 댓글 목록 창이 뜬다', 창 && 줄마다, true);
    });

    await test.step('댓글 창의 「닫기」를 누른다', async () => {
      await 화면.창닫기누르기();
      await verify('댓글 창에서 「닫기」를 누르면 창이 닫힌다', await 화면.창.isVisible(), false);
    });

    await test.step('「공지 쓰기」를 누른다', async () => {
      await 화면.공지창열기();
      const 제목칸 = await verify('제목 칸이 보인다', await 화면.제목칸.isVisible(), true);
      const 본문칸 = await verify('본문 칸이 보인다', await 화면.본문칸.isVisible(), true);
      await verify('게시판 화면에서 「공지 쓰기」를 누르면 제목 · 본문 칸이 있는 창이 뜬다', 제목칸 && 본문칸, true);
    });

    await test.step('공지 창의 「닫기」를 누른다', async () => {
      await 화면.창닫기누르기();
      await verify('공지 창에서 「닫기」를 누르면 창이 닫힌다', await 화면.창.isVisible(), false);
    });
  } finally {
    await 정리.비우기();
  }
});

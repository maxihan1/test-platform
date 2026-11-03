import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 글만들기, 공지숨길등록, 임의글자, 정리함, 회원마당열기, type 만든글 } from './helpers/board-flow.helper.js';
import { 공지쓰기 } from './helpers/ops-data.helper.js';
import { 커뮤니티목록화면 } from './pages/community.page.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-199',
  name: '게시판에서 「숨기기」를 누르면 그 글이 커뮤니티 목록에서 빠진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 쓴 글이 있다', '관리자 계정으로 로그인해 있고 관리자가 쓴 공지가 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 정리 = new 정리함();
  const 게시판 = new 운영게시판화면(page);
  const 목록 = new 커뮤니티목록화면(page);
  const 틀 = new 운영틀(page);
  let 글: 만든글;
  const 공지제목 = `시험공지 ${임의글자(8)}`;
  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    });

    await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
      await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('일회용 회원이 글을 쓰고 관리자가 공지를 쓴다', async () => {
      const 마당 = await 회원마당열기(page, request, 정리);
      글 = await 글만들기(마당, page, 정리);
      공지숨길등록(page, 공지제목, 정리);
      await 공지쓰기(page, 공지제목, '시험으로 쓴 공지의 본문입니다');
    });

    await test.step('커뮤니티 목록과 게시판 화면에서 그 글과 공지 줄을 확인한다', async () => {
      await 목록.열기();
      await verify('커뮤니티 목록에 그 글이 보인다', await 목록.제목링크(글.title).isVisible(), true, { blocker: true });
      await verify('커뮤니티 목록에 그 공지가 보인다', await 목록.제목링크(공지제목).isVisible(), true, { blocker: true });
      await 게시판.열기();
      await verify('게시판 화면에 그 글 줄이 보인다', await 게시판.줄(글.title).isVisible(), true, { blocker: true });
      await verify('게시판 화면에 그 공지 줄이 보인다', await 게시판.줄(공지제목).isVisible(), true, { blocker: true });
    });

    await test.step('그 글 줄의 「숨기기」를 누른 뒤 커뮤니티 목록을 연다', async () => {
      await 게시판.숨기기토글누르기(글.title, '숨기기');
      await 목록.열기();
      await verify('게시판에서 「숨기기」를 누르면 그 글이 커뮤니티 목록에서 빠진다', await 목록.제목링크(글.title).isVisible(), false);
    });

    await test.step('그 공지 줄의 「숨기기」를 누른 뒤 커뮤니티 목록을 연다', async () => {
      await 게시판.열기();
      await 게시판.숨기기토글누르기(공지제목, '숨기기');
      await 목록.열기();
      await verify('공지를 숨기면 커뮤니티 목록 공지 줄에서 빠진다', await 목록.제목링크(공지제목).isVisible(), false);
    });
  } finally {
    await 정리.비우기();
  }
});

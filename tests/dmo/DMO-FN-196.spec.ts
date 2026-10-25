import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 글만들기, 정리함, 회원마당열기, type 만든글 } from './helpers/board-flow.helper.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-196',
  name: '게시판 검색칸에 글 제목을 적으면 그 글만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 쓴 글이 있다'],
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

    await test.step('일회용 회원이 글을 쓴다', async () => {
      const 마당 = await 회원마당열기(page, request, 정리);
      글 = await 글만들기(마당, page, 정리);
    });

    await test.step('게시판 화면에서 그 글 줄을 확인한다', async () => {
      await 화면.열기();
      await verify('게시판 화면에 그 글 줄이 보인다', await 화면.줄(글.title).isVisible(), true, { blocker: true });
    });

    await test.step('검색칸에 그 글 제목을 적는다', async () => {
      await 화면.검색하기(글.title);
      const 제목들 = (await 화면.줄들()).map((줄) => 줄.제목).join(', ');
      await verify('게시판 검색칸에 글 제목을 적으면 그 글만 보인다', 제목들, 글.title);
    });
  } finally {
    await 정리.비우기();
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 글만들기, 댓글만들기, 정리함, 회원마당열기, type 만든글, type 만든댓글 } from './helpers/board-flow.helper.js';
import { 댓글숨기기 } from './helpers/ops-data.helper.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-211',
  name: '댓글 두 개 가운데 하나를 숨긴 글 줄에 「댓글 2」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원 글에 댓글 두 개가 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 정리 = new 정리함();
  const 게시판 = new 운영게시판화면(page);
  const 틀 = new 운영틀(page);
  let 글: 만든글;
  let 첫댓글: 만든댓글;
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
      첫댓글 = await 댓글만들기(마당, 글.id, '시험 댓글 하나');
      await 댓글만들기(마당, 글.id, '시험 댓글 둘');
    });

    await test.step('게시판 화면에서 그 글 줄을 확인한다', async () => {
      await 게시판.열기();
      await verify('그 글 줄에 「댓글 2」가 보인다', await 게시판.줄버튼(글.title, '댓글 2').isVisible(), true, { blocker: true });
    });

    await test.step('댓글 하나를 숨긴 뒤 게시판에서 그 글 줄을 찾는다', async () => {
      await 댓글숨기기(page, 첫댓글.id, true);
      await 게시판.열기();
      await verify('댓글 두 개 가운데 하나를 숨긴 글 줄에 「댓글 2」가 보인다', await 게시판.줄버튼(글.title, '댓글 2').isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});

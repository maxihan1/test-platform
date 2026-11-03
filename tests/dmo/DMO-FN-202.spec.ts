import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 글만들기, 정리함, 회원마당열기, type 만든글 } from './helpers/board-flow.helper.js';
import { 글숨기기 } from './helpers/ops-data.helper.js';
import { 커뮤니티글화면 } from './pages/community-post.page.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-202',
  name: '숨긴 글 주소를 열면 「운영 정책에 따라 숨겨진 게시글입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 쓴 글을 숨겼다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 정리 = new 정리함();
  const 게시판 = new 운영게시판화면(page);
  const 글화면 = new 커뮤니티글화면(page);
  const 틀 = new 운영틀(page);
  let 글: 만든글;
  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    });

    await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
      await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('일회용 회원이 쓴 글을 숨긴다', async () => {
      const 마당 = await 회원마당열기(page, request, 정리);
      글 = await 글만들기(마당, page, 정리);
      await 글숨기기(page, 글.id, true);
    });

    await test.step('게시판 화면에서 숨긴 글 줄을 확인한다', async () => {
      await 게시판.열기();
      await verify('숨긴 글 줄의 상태가 「숨김」이다', await 게시판.줄(글.title).getByRole('cell', { name: '숨김', exact: true }).isVisible(), true, { blocker: true });
    });

    await test.step('숨긴 글 주소를 연다', async () => {
      await 글화면.열기(글.id);
      await verify('숨긴 글 주소를 열면 「운영 정책에 따라 숨겨진 게시글입니다」가 보인다', await 글화면.숨김안내.isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});

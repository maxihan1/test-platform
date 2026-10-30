import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 글만들기, 댓글만들기, 정리함, 회원마당열기, type 만든글, type 만든댓글 } from './helpers/board-flow.helper.js';
import { 댓글숨기기 } from './helpers/ops-data.helper.js';
import { 커뮤니티글화면 } from './pages/community-post.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-220',
  name: '숨긴 댓글은 커뮤니티 글의 댓글 수에서 빠진다',
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
  const 글화면 = new 커뮤니티글화면(page);
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

    await test.step('커뮤니티 글 상세에서 댓글 두 개를 확인한다', async () => {
      await 글화면.열기(글.id);
      await 글화면.댓글그려질때까지();
      await verify('댓글 수가 2다', await 글화면.댓글수읽기(), 2, { blocker: true });
    });

    await test.step('댓글 하나를 숨긴 뒤 커뮤니티 글 상세의 댓글 수를 읽는다', async () => {
      await 댓글숨기기(page, 첫댓글.id, true);
      await 글화면.열기(글.id);
      await 글화면.댓글그려질때까지();
      await verify('숨긴 댓글은 커뮤니티 글의 댓글 수에서 빠진다', await 글화면.댓글수읽기(), 1);
    });
  } finally {
    await 정리.비우기();
  }
});

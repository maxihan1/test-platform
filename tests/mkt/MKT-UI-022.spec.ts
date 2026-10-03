import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 게시글상세 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-022',
  name: '관리자에게는 「삭제」 버튼만 보이고 「수정」 버튼은 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
    postId: z.number().describe('회원이 쓴 글 번호').default(47),
  }),
  expected: z.object({
    buttons: z.string().describe('수정 · 삭제 버튼이 보이는지').default('false, true'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 상세 = new 게시글상세(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 로그인.로그인한다(params.adminId, params.adminPassword ?? '');
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await 머리.관리자링크.waitFor();
    await verify('관리자 계정으로 로그인해 있다', await 머리.관리자링크.isVisible(), true, { blocker: true });
  });

  await test.step('회원이 쓴 글의 상세 화면을 연다', async () => {
    await 상세.열기(params.postId);
    await 상세.좋아요.waitFor();
    await verify(
      '관리자에게는 「삭제」 버튼만 보이고 「수정」 버튼은 보이지 않는다',
      [await 상세.수정.isVisible(), await 상세.삭제.isVisible()].join(', '),
      expected.buttons,
    );
  });
});

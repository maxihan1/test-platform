import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 글쓰기 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-026',
  name: '관리자의 분류 드롭다운에는 「공지」가 더 보인다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    categories: z.string().describe('관리자의 분류 항목').default('자유, 질문, 후기, 공지'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 쓰기 = new 글쓰기(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 로그인.로그인한다(params.adminId, params.adminPassword ?? '');
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await 머리.관리자링크.waitFor();
    await verify('관리자 계정으로 로그인해 있다', await 머리.관리자링크.isVisible(), true, { blocker: true });
  });

  await test.step('글쓰기 화면을 연다', async () => {
    await 쓰기.열기();
    await 쓰기.분류항목.nth(3).waitFor({ state: 'attached' });
    await verify('관리자의 분류 드롭다운에는 「공지」가 더 보인다', (await 쓰기.분류항목.allInnerTexts()).join(', '), expected.categories);
  });
});

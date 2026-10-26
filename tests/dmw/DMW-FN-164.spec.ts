import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-164',
  name: '관리자 글쓰기 분류 선택 상자에 「공지」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);

  await test.step('관리자 계정으로 로그인해 글쓰기 화면을 연다', async () => {
    await 계정으로로그인(page, params.adminId, params.adminPassword);
    await 안내창막기(page);
    await 쓰기.열기();
    await 머리.그려질때까지();
    await verify('관리자 계정으로 로그인해 있다', await 머리.관리자.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('관리자로 글쓰기 분류 선택 상자를 연다', async () => {
    await verify('관리자 글쓰기 분류 선택 상자에 「공지」가 보인다', (await 쓰기.분류목록()).includes('공지'), true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-193',
  name: '게시판 화면에서 「분류」를 「질문」으로 고르면 분류가 「질문」인 글만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    category: z.enum(['자유', '질문', '후기']).describe('고를 분류 — 자유 · 질문 · 후기 가운데 하나').default('질문'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 운영게시판화면(page);
  const 틀 = new 운영틀(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 운영게시판화면.주소);
  });

  await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
    await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('「분류」를 「질문」으로 고른다', async () => {
    await 화면.분류고르기하기(params.category);
    const 분류들 = [...new Set((await 화면.줄들()).map((줄) => 줄.분류))].join(', ');
    await verify('게시판 화면에서 「분류」를 「질문」으로 고르면 분류가 「질문」인 글만 보인다', 분류들, params.category);
  });
});

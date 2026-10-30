import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-061',
  name: '게시판 화면 표에 번호 · 분류 · 제목 · 글쓴이 · 등록일 · 상태 열이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 운영게시판화면(page);
  const 틀 = new 운영틀(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
  });

  await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
    await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('/ops/board 를 연다', async () => {
    await 화면.열기();
    const 번호 = await verify('「번호」 열이 보인다', await 화면.열머리('번호').isVisible(), true);
    const 분류 = await verify('「분류」 열이 보인다', await 화면.열머리('분류').isVisible(), true);
    const 제목 = await verify('「제목」 열이 보인다', await 화면.열머리('제목').isVisible(), true);
    const 글쓴이 = await verify('「글쓴이」 열이 보인다', await 화면.열머리('글쓴이').isVisible(), true);
    const 등록일 = await verify('「등록일」 열이 보인다', await 화면.열머리('등록일').isVisible(), true);
    const 상태 = await verify('「상태」 열이 보인다', await 화면.열머리('상태').isVisible(), true);
    await verify('게시판 화면 표에 번호 · 분류 · 제목 · 글쓴이 · 등록일 · 상태 열이 보인다', 번호 && 분류 && 제목 && 글쓴이 && 등록일 && 상태, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-187',
  name: '게시판 화면의 「전체」 칩 건수가 「보이는 글」과 「숨긴 글」 칩 건수의 합과 같다',
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
    const 전체 = await 화면.칩건수(화면.전체칩);
    const 보이는 = await 화면.칩건수(화면.보이는칩);
    const 숨긴 = await 화면.칩건수(화면.숨긴칩);
    await verify('게시판 화면의 「전체」 칩 건수가 「보이는 글」과 「숨긴 글」 칩 건수의 합과 같다', 전체, 보이는 + 숨긴);
  });
});

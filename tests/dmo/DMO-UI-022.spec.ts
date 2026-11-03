import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 회원관리화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-022',
  name: '회원 관리 화면의 관리자 계정 줄에 버튼이 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 회원 = new 회원관리화면(page);
  const 관리자아이디 = params.adminId ?? '';

  await test.step('관리자 계정으로 로그인해 있음을 확인한다', async () => {
    await API로그인(page, 관리자아이디, params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    await 회원.열기();
  });

  await test.step('검색칸에 관리자 아이디를 적는다', async () => {
    await 회원.검색하기(관리자아이디);
    await 회원.회원줄(관리자아이디).waitFor();
    await verify('회원 관리 화면의 관리자 계정 줄에 버튼이 보이지 않는다', await 회원.회원줄(관리자아이디).getByRole('button').count(), 0);
  });
});

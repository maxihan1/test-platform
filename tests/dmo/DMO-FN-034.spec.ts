import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 회원번호, 회원조작 } from './helpers/ops-data.helper.js';
import { 세션읽기, 회원상태읽기 } from './helpers/users-flow.helper.js';
import { 회원관리화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-034',
  name: '회원 관리 화면에서 「상태」를 「잠김」으로 고르면 상태가 「잠김」인 회원만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 잠겨 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 회원 = new 회원관리화면(page);
  let 일회용: 일회용회원;

  await test.step('일회용 회원을 만들어 잠근다', async () => {
    일회용 = await 회원가입(request);
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await 회원조작(page, await 회원번호(page, 일회용.loginId), 'lock');
  });

  await test.step('관리자 계정으로 로그인해 있고 일회용 회원이 잠겨 있음을 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    await verify('일회용 회원이 잠겨 있다', await 회원상태읽기(page, 일회용.loginId), 'locked', { blocker: true });
  });

  await test.step('「상태」를 「잠김」으로 고른다', async () => {
    await 회원.열기();
    await 회원.상태고르기('잠김');
    const 상태들 = (await 회원.칸들('상태').allInnerTexts()).map((글자) => 글자.trim());
    await verify('회원 관리 화면에서 「상태」를 「잠김」으로 고르면 상태가 「잠김」인 회원만 보인다', [...new Set(상태들)].join(', '), '잠김');
  });
});

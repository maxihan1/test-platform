import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 회원번호, 회원조작 } from './helpers/ops-data.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';

import { 회원관리화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-052',
  name: '잠긴 일회용 회원 줄의 「잠금 풀기」를 누르면 그 회원 상태가 「정상」으로 바뀐다',
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
    await 회원.열기();
    await 회원.검색하기(일회용.loginId);
    await verify('일회용 회원이 잠겨 있다', (await 회원.상태칸(일회용.loginId).innerText()).trim(), '잠김', { blocker: true });
  });

  await test.step('일회용 회원 줄의 「잠금 풀기」를 누른다', async () => {
    await 회원.줄버튼(일회용.loginId, '잠금 풀기').click();
    await 회원.줄버튼(일회용.loginId, '잠그기').waitFor();
    await verify('잠긴 일회용 회원 줄의 「잠금 풀기」를 누르면 그 회원 상태가 「정상」으로 바뀐다', (await 회원.상태칸(일회용.loginId).innerText()).trim(), '정상');
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 로그인한역할 } from './helpers/my-admin-tools.helper.js';
import { 잠긴일회용회원 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-325',
  name: '잠긴 회원 줄의 「잠금 해제」를 누르면 그 회원이 다시 로그인할 수 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 관리자화면(page);
  const 알림 = new 토스트(page);
  let 회원 = { loginId: '', password: '' };

  await test.step('5번 틀려 잠긴 일회용 회원을 만든다', async () => {
    회원 = await 잠긴일회용회원(request);
  });

  await test.step('잠긴 일회용 회원이 로그인되지 않는지 확인한다', async () => {
    const 응답 = await request.post('/api/auth/login', { data: { loginId: 회원.loginId, password: 회원.password, remember: false } });
    await verify('일회용 회원은 5번 틀려 잠겨 있다', 응답.status(), 423, { blocker: true });
  });

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.adminId, params.adminPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 로그인한역할(page.request), 'admin', { blocker: true });
  });

  await test.step('관리자 화면을 연다', async () => {
    await 화면.열기();
    await verify('회원 관리 표가 보인다', await 화면.회원표.isVisible(), true, { blocker: true });
  });

  await test.step('5번 틀려 잠긴 일회용 회원 줄의 「잠금 해제」를 누른다', async () => {
    await 화면.아이디검색(회원.loginId);
    await 화면.잠금해제누르기(회원.loginId);
    await 알림.글('잠금이 해제되었습니다').first().waitFor();
    const 응답 = await request.post('/api/auth/login', { data: { loginId: 회원.loginId, password: 회원.password, remember: false } });
    await verify('잠긴 회원 줄의 「잠금 해제」를 누르면 그 회원이 다시 로그인할 수 있다', 응답.status(), 200);
  });
});

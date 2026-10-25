import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기, 로그인한역할, 몸읽기, 역할로그인, 잠긴일회용회원 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-392',
  name: '관리자가 회원 목록 API 를 부르면 회원 목록을 돌려준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  let 회원 = { id: 0, loginId: '', password: '', name: '', email: '' };

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 역할로그인(page.request, params.adminId, params.adminPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 로그인한역할(page.request), 'admin', { blocker: true });
  });

  await test.step('관리자로 GET /api/admin/users 를 부른다', async () => {
    const 몸 = await 몸읽기<{ items?: unknown[] }>(await page.request.get('/api/admin/users'));
    await verify('관리자가 회원 목록 API 를 부르면 회원 목록을 돌려준다', Array.isArray(몸.items) && 몸.items.length > 0, true);
  });

  await test.step('잠긴 일회용 회원으로 POST /api/admin/users/{id}/unlock 을 부른다', async () => {
    회원 = await 잠긴일회용회원(request);
    const 잠김 = await verify('일회용 회원은 5번 틀려 잠겨 있다', (await 로그인하기(request, 회원.loginId, 회원.password)).status(), 423, { blocker: true });
    const 해제 = await page.request.post(`/api/admin/users/${회원.id}/unlock`);
    const 로그인 = await 로그인하기(request, 회원.loginId, 회원.password);
    await verify('관리자가 잠금 해제 API 를 부르면 그 회원이 다시 로그인할 수 있다', 잠김 && 해제.ok() && 로그인.status() === 200, true);
  });
});

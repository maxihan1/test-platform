import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 회원번호 } from './helpers/ops-data.helper.js';
import { 알림쿠폰화면 } from './pages/notify.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-437',
  name: '알림 내용칸에 100자를 적으면 100자가 다 들어간다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    채울글자수: z.number().int().describe('100자 줄에서 적을 내용 글자 수 — 1~100').default(100),
    초과글자수: z.number().int().describe('한도를 넘겨 적을 내용 글자 수 — 101~200').default(101),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 알림쿠폰화면(page);
  let 회원: 일회용회원;

  await test.step('관리자 계정으로 로그인하고 일회용 회원을 만든다', async () => {
    회원 = await 회원가입(request);
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 알림쿠폰화면.주소);
  });

  await test.step('관리자 로그인과 일회용 회원을 확인한다', async () => {
    await 화면.그려질때까지();
    const 로그인 = await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true);
    const 있음 = await verify('일회용 회원이 있다', (await 회원번호(page, 회원.loginId)) > 0, true);
    await verify('관리자 계정으로 로그인해 있고 일회용 회원이 있다', 로그인 && 있음, true, { blocker: true });
  });

  await test.step('내용칸에 100자를 적는다', async () => {
    await 화면.알림내용.fill('가'.repeat(params.채울글자수));
    await verify('알림 내용칸에 100자를 적으면 100자가 다 들어간다', (await 화면.알림내용.inputValue()).length, params.채울글자수);
  });

  await test.step('내용칸에 101자를 적는다', async () => {
    await 화면.알림내용.fill('나'.repeat(params.초과글자수));
    await verify('알림 내용칸에 101자를 적으면 100자까지만 들어간다', (await 화면.알림내용.inputValue()).length, 100);
  });
});

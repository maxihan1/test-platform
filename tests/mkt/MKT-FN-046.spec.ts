import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-046',
  name: '「로그인 상태 유지」를 체크하면 로그인 쿠키가 7일간 유지되고 체크하지 않으면 브라우저를 닫을 때 사라진다',
  precondition: ['비회원이다', '로그인할 수 있는 회원 계정이 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    days: z.number().describe('쿠키 유지 일수').default(7),
    sessionExpires: z.number().describe('브라우저를 닫을 때 사라지는 쿠키의 만료 값').default(-1),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 비밀번호 = params.password ?? '';

  await test.step('로그인 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('「로그인 상태 유지」를 체크하고 로그인한다', async () => {
    await 화면.입력한다(params.loginId, 비밀번호);
    await 화면.로그인유지.check();
    await 화면.로그인버튼.click();
    await 머리.로그아웃.waitFor();
    const 만료 = (await 화면.로그인쿠키만료()) ?? 0;
    await verify('「로그인 상태 유지」를 체크하고 로그인하면 로그인 쿠키가 7일간 유지된다', Math.round((만료 - Date.now() / 1000) / 86400), expected.days);
  });

  await test.step('「로그인 상태 유지」를 체크하지 않고 로그인한다', async () => {
    await page.context().clearCookies();
    await 화면.열기();
    await 화면.입력한다(params.loginId, 비밀번호);
    await 화면.로그인버튼.click();
    await 머리.로그아웃.waitFor();
    await verify('「로그인 상태 유지」를 체크하지 않으면 로그인 쿠키는 브라우저를 닫을 때 사라진다', await 화면.로그인쿠키만료(), expected.sessionExpires);
  });
});

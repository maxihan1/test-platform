import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 로그인한역할 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-326',
  name: '잠기지 않은 회원 줄에는 「잠금 해제」가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  techniques: ['상태 전이'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 관리자화면(page);
  let 아이디 = '';

  await test.step('잠기지 않은 일회용 회원을 만든다', async () => {
    아이디 = (await 일회용회원만들기(request)).loginId;
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

  await test.step('잠기지 않은 회원 줄을 확인한다', async () => {
    await 화면.아이디검색(아이디);
    const 줄 = await verify('잠기지 않은 회원 줄이 보인다', await 화면.회원줄(아이디).isVisible(), true);
    const 버튼 = await verify('그 줄에 「잠금 해제」가 보이지 않는다', await 화면.잠금해제버튼(아이디).isVisible(), false);
    await verify('잠기지 않은 회원 줄에는 「잠금 해제」가 보이지 않는다', 줄 && 버튼, true);
  });
});

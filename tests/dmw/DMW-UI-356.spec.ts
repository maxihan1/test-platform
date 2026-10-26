import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한역할 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-356',
  name: '관리자 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 관리자화면(page);
  let 처음순서: string[] = [];

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

  await test.step('관리자 화면의 「배너 관리」 탭을 누른다', async () => {
    await 화면.배너탭.click();
    await verify('관리자 화면에서 「배너 관리」 탭을 누르면 배너 관리 패널이 보인다', await 화면.배너패널.isVisible(), true);
  });

  await test.step('관리자 화면의 「설정 · 내보내기」 탭을 누른다', async () => {
    await 화면.설정탭.click();
    await verify('관리자 화면에서 「설정 · 내보내기」 탭을 누르면 설정 패널이 보인다', await 화면.설정패널.isVisible(), true);
  });

  await test.step('배너 관리 첫 배너의 「아래로」를 누른다', async () => {
    await 화면.배너탭.click();
    await 화면.위로버튼들.first().waitFor();
    처음순서 = await 화면.배너제목들();
    await 화면.배너아래로(처음순서[0]).click();
    const 바뀐순서 = [처음순서[1], 처음순서[0], ...처음순서.slice(2)];
    await verify('관리자 화면에서 첫 배너 「아래로」를 누르면 배너 순서가 바뀐다', (await 화면.배너제목들()).join(', '), 바뀐순서.join(', '));
  });
});

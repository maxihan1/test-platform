import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한역할 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-238',
  name: '회원 관리 표 위에 「총 <N>명」이 보인다',
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

  await test.step('회원 관리 표 위를 확인한다', async () => {
    const 글 = await verify('「총 <N>명」이 보인다', await 화면.총인원.isVisible(), true);
    const 총인원칸 = await 화면.총인원.boundingBox();
    const 표칸 = await 화면.회원표.boundingBox();
    const 위 = await verify('「총 <N>명」이 회원 관리 표보다 위에 있다', 총인원칸 !== null && 표칸 !== null && 총인원칸.y < 표칸.y, true);
    await verify('회원 관리 표 위에 「총 <N>명」이 보인다', 글 && 위, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한역할 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-324',
  name: '칸 제목을 한 번 누르면 그 칸 오름차순으로 정렬되고 제목 옆에 「▲」가 보인다',
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

  await test.step('회원 관리 「아이디」 칸 제목을 누른다', async () => {
    await 화면.열제목누르기('아이디');
    const 표시 = await verify('「아이디」 제목 옆에 「▲」가 보인다', await 화면.열제목('아이디').innerText(), '아이디 ▲');
    const 아이디들 = await 화면.보이는아이디들();
    const 순서 = await verify('보이는 회원이 아이디 오름차순으로 늘어서 있다', 아이디들.join(', '), [...아이디들].sort((가, 나) => 가.localeCompare(나, 'ko')).join(', '));
    await verify('칸 제목을 한 번 누르면 그 칸 오름차순으로 정렬되고 제목 옆에 「▲」가 보인다', 표시 && 순서, true);
  });

  await test.step('「아이디」 칸 제목을 한 번 더 누른다', async () => {
    await 화면.열제목누르기('아이디');
    const 표시 = await verify('「아이디」 제목 옆에 「▼」가 보인다', await 화면.열제목('아이디').innerText(), '아이디 ▼');
    const 아이디들 = await 화면.보이는아이디들();
    const 순서 = await verify('보이는 회원이 아이디 내림차순으로 늘어서 있다', 아이디들.join(', '), [...아이디들].sort((가, 나) => 나.localeCompare(가, 'ko')).join(', '));
    await verify('칸 제목을 다시 누르면 그 칸 내림차순으로 정렬되고 제목 옆에 「▼」가 보인다', 표시 && 순서, true);
  });
});

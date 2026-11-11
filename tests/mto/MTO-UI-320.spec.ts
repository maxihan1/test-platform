import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-320',
  name: '역할 화면에 Owner 「1개의 권한」 · Admin 「18개의 권한」 · Moderator 「6개의 권한」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 역할화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「역할」 화면을 연다', async () => {
    await 목록.열기();
    const 소유자 = await verify('Owner 「1개의 권한」이 보인다', (await 목록.권한수('Owner').innerText()).trim(), '1개의 권한');
    const 관리자 = await verify('Admin 「18개의 권한」이 보인다', (await 목록.권한수('Admin').innerText()).trim(), '18개의 권한');
    const 중재자 = await verify('Moderator 「6개의 권한」이 보인다', (await 목록.권한수('Moderator').innerText()).trim(), '6개의 권한');
    await verify('역할 화면에 Owner 「1개의 권한」 · Admin 「18개의 권한」 · Moderator 「6개의 권한」이 보인다', 소유자 && 관리자 && 중재자, true);
  });
});

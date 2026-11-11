import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-266',
  name: '역할 화면에 「기본 권한」 카드와 Owner · Admin · Moderator 차례의 역할 카드, 「역할 추가」가 보인다',
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
    const 기본 = await verify('「기본 권한」 카드가 보인다', await 목록.기본권한카드.isVisible(), true);
    const 차례 = await verify('역할 카드가 Owner, Admin, Moderator 차례로 이어진다', (await 목록.역할이름들()).slice(1, 4).join(', '), 'Owner, Admin, Moderator');
    const 추가 = await verify('「역할 추가」가 보인다', await 목록.역할추가.isVisible(), true);
    await verify('역할 화면에 「기본 권한」 카드와 Owner · Admin · Moderator 차례의 역할 카드, 「역할 추가」가 보인다', 기본 && 차례 && 추가, true);
  });
});

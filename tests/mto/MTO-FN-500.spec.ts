import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버규칙화면 } from './pages/rules.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-500',
  name: '「규칙」을 비우고 추가하면 규칙이 만들어지지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 규칙 = new 서버규칙화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「규칙」을 비우고 「규칙 추가」를 누른다', async () => {
    await 규칙.열기();
    const 전 = await 규칙.규칙줄들.count();
    await 규칙.추가폼열기();
    await 규칙.규칙적고추가누르기('');
    await 규칙.오류안내.first().waitFor({ timeout: 10_000 });
    await 규칙.열기();
    await verify('「규칙」을 비우고 추가하면 규칙이 만들어지지 않는다', await 규칙.규칙줄들.count(), 전);
  });
});

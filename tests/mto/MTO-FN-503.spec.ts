import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 역할정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할폼화면 } from './pages/role-form.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-503',
  name: '우선순위 2000 으로 역할을 저장하면 「당신의 현재 역할보다 높을 수 없습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 폼 = new 역할폼화면(page);
  const 이름 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('역할 추가 폼에 「이름」과 「우선순위」 2000 을 적고 저장한다', async () => {
      await 폼.추가폼열기();
      await 폼.이름.fill(이름);
      await 폼.우선순위.fill('2000');
      await 폼.추가제출.click();
      const 보인다 = await 폼.우선순위초과오류.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('우선순위 2000 으로 역할을 저장하면 「당신의 현재 역할보다 높을 수 없습니다」가 보인다', 보인다, true);
    });
  } finally {
    await 역할정리(page, 이름);
  }
});

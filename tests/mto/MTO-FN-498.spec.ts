import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 이용약관초안화면 } from './pages/terms-draft.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-498',
  name: '「시행일」을 오늘로 적고 「초안 저장」을 누르면 「너무 이릅니다.」로 시작하는 안내가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 초안 = new 이용약관초안화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('초안 화면에서 「시행일」을 오늘로 적고 「초안 저장」을 누른다', async () => {
    await 초안.열기();
    await 초안.시행일적기(new Date());
    await 초안.초안저장.click();
    const 떴다 = await 초안.너무이름.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「시행일」을 오늘로 적고 「초안 저장」을 누르면 「너무 이릅니다.」로 시작하는 안내가 보인다', 떴다, true);
  });
});

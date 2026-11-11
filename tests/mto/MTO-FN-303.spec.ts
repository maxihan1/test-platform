import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 이용약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-303',
  name: 'Owner 가 사이드바 「관리」 › 「이용 약관」을 누르면 제목 「이용 약관」 화면이 열린다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 대상 = new 이용약관화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('사이드바 「관리」 › 「이용 약관」을 누른다', async () => {
    await 관리.사이드바.메뉴('이용 약관').click();
    const 열렸다 = await 대상.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('Owner 가 사이드바 「관리」 › 「이용 약관」을 누르면 제목 「이용 약관」 화면이 열린다', 열렸다, true);
  });
});

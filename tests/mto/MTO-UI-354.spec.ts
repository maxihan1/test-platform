import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-354',
  name: '사이드바에서 「Sidekiq」을 누르면 새 탭이 열린다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 대시보드.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.메뉴('로그아웃').waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('사이드바 맨 아래 「Sidekiq」을 누른다', async () => {
    const 새탭받기 = page.context().waitForEvent('page', { timeout: 10_000 });
    await 관리.사이드바.메뉴('Sidekiq').click();
    const 새탭 = await 새탭받기.then((탭) => 탭, () => undefined);
    await verify('사이드바에서 「Sidekiq」을 누르면 새 탭이 열린다', 새탭 !== undefined, true);
    await 새탭?.close();
  });
});

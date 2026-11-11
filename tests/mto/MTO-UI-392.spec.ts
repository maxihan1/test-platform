import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-392',
  name: '역할 카드의 사용자 수를 누르면 그 역할로 거른 「계정」 목록으로 간다',
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
  const 계정 = new 계정목록화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('역할 화면에서 Moderator 카드의 「1명의 사용자」를 누른다', async () => {
    await 목록.열기();
    const 링크 = await 목록.사용자수('Moderator').getAttribute('href');
    await 목록.사용자수('Moderator').click();
    const 열렸다 = await 계정.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 목록화면 = await verify('「계정」 목록이 열린다', 열렸다, true);
    const 걸렀다 = await verify('그 역할로 거른 주소로 간다', 목록.현재경로와검색어(), 링크 ?? '');
    await verify('역할 카드의 사용자 수를 누르면 그 역할로 거른 「계정」 목록으로 간다', 목록화면 && 걸렀다, true);
  });
});

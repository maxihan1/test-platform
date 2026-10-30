import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-001',
  name: '관리자로 로그인해 /ops 를 열면 「대시보드」 제목이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);

  await test.step('관리자로 로그인해 /ops 를 연다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 대시보드화면.주소);
    await verify('관리자로 로그인해 /ops 를 열면 「대시보드」 제목이 보인다', await 대시보드.제목.isVisible(), true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 화면로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 운영틀 } from './components/ops-frame.component.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-009',
  name: '로그인하지 않고 /ops 를 열면 로그인 화면으로 간다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['로그인하지 않았다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 대시보드 = new 대시보드화면(page);
  const 틀 = new 운영틀(page);

  await test.step('로그인하지 않았음을 확인한다', async () => {
    await verify('로그인하지 않았다', await 세션읽기(page), null, { blocker: true });
  });

  await test.step('로그인하지 않고 /ops 를 연다', async () => {
    await page.goto(대시보드화면.주소);
    await 로그인.아이디칸.waitFor();
    await verify('로그인하지 않고 /ops 를 열면 로그인 화면으로 간다', await 로그인.제목.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 관리자로 로그인한다', async () => {
    await 화면로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await 틀.메뉴.waitFor();
    await 틀.다그려질때까지();
    await verify('로그인하면 「대시보드」 화면으로 돌아온다', await 대시보드.제목.isVisible(), true);
  });
});

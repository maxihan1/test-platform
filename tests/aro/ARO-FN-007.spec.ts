import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-007',
  name: '「/login?next=//example.com」에서 로그인하면 대시보드로 간다',
  precondition: ['로그인하지 않았다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('「/login?next=//example.com」을 열고 운영자 계정으로 로그인한다', async () => {
    await verify('로그인 화면이 열려 있다', await 로그인.열렸나('//example.com'), true, { blocker: true });
    await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
    const 도착 = await 대시보드.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「/login?next=//example.com」에서 로그인하면 대시보드로 간다', 도착 && new URL(page.url()).pathname === 대시보드화면.주소, true);
  });
});

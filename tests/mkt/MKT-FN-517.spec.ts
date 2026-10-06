import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/common-login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-517',
  name: '관리자로 로그인하면 머리글에 「관리자」 링크가 더 보인다',
  platforms: ['desktop'],
  precondition: ['관리자 계정이 있다'],
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디').default('admin'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 안내창끄기(page);
    await 로그인.열기();
    await verify('관리자 계정이 있다', params.adminPassword !== undefined && params.adminPassword !== '', true, { blocker: true });
  });

  await test.step('로그인 화면에서 관리자 계정으로 로그인한다', async () => {
    await 로그인.로그인하기(params.adminLoginId, params.adminPassword ?? '');
    await 로그인.머리글.로그인됐나기다리기();
    await verify('관리자로 로그인하면 머리글에 「관리자」 링크가 더 보인다', await 로그인.머리글.관리자링크.isVisible(), true);
  });
});

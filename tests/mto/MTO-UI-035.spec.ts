import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-035',
  name: '계정 목록의 「역할」 필터에 「기본 권한」이 보이지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);

  await test.step('Owner 계정으로 로그인하고 「계정」 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「계정」 화면에서 「역할」 필터를 연다', async () => {
    await 목록.역할필터.click();
    await verify('계정 목록의 「역할」 필터에 「기본 권한」이 보이지 않는다', (await 목록.선택지글(목록.역할필터)).split(', ').includes('기본 권한'), false);
  });
});

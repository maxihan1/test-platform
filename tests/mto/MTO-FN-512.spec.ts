import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 웹훅폼화면 } from './pages/webhook-form.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-512',
  name: '「엔드포인트 URL」에 「not a url」을 적고 저장하면 「올바른 URL이 아닙니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 폼 = new 웹훅폼화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「엔드포인트 URL」에 「not a url」을 적고 이벤트 하나를 켠 뒤 저장한다', async () => {
    await 폼.열기();
    await 폼.적기('not a url', ['account.created']);
    await 폼.추가제출.click();
    const 보인다 = await 폼.올바르지않은값.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「엔드포인트 URL」에 「not a url」을 적고 저장하면 「올바른 URL이 아닙니다」가 보인다', 보인다, true);
  });
});

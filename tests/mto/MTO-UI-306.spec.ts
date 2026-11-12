import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 웹훅폼화면 } from './pages/webhook-form.page.js';
import { 웹훅화면 } from './pages/webhooks.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-306',
  name: '웹훅 추가 폼에 이벤트 체크박스 account.approved · account.created · account.updated · report.created · report.updated · status.created · status.updated 가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 웹훅화면(page);
  const 폼 = new 웹훅폼화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「웹훅」 화면에서 「엔드포인트 추가」를 누른다', async () => {
    await 목록.열기();
    await 목록.엔드포인트추가.click();
    await 폼.주소칸.waitFor();
    const 이벤트1 = await verify('이벤트 account.approved 체크박스가 보인다', await 폼.이벤트('account.approved').isVisible(), true);
    const 이벤트2 = await verify('이벤트 account.created 체크박스가 보인다', await 폼.이벤트('account.created').isVisible(), true);
    const 이벤트3 = await verify('이벤트 account.updated 체크박스가 보인다', await 폼.이벤트('account.updated').isVisible(), true);
    const 이벤트4 = await verify('이벤트 report.created 체크박스가 보인다', await 폼.이벤트('report.created').isVisible(), true);
    const 이벤트5 = await verify('이벤트 report.updated 체크박스가 보인다', await 폼.이벤트('report.updated').isVisible(), true);
    const 이벤트6 = await verify('이벤트 status.created 체크박스가 보인다', await 폼.이벤트('status.created').isVisible(), true);
    const 이벤트7 = await verify('이벤트 status.updated 체크박스가 보인다', await 폼.이벤트('status.updated').isVisible(), true);
    await verify('웹훅 추가 폼에 이벤트 체크박스 account.approved · account.created · account.updated · report.created · report.updated · status.created · status.updated 가 보인다', 이벤트1 && 이벤트2 && 이벤트3 && 이벤트4 && 이벤트5 && 이벤트6 && 이벤트7, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 웹훅정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 웹훅폼화면 } from './pages/webhook-form.page.js';
import { 웹훅화면 } from './pages/webhooks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-387',
  name: '「페이로드 템플릿」에 문법이 틀린 JSON 을 적고 저장하면 저장되지 않고 오류가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
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
  const 주소 = `https://${고유이름('mto')}.example.com/hook`;

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「페이로드 템플릿」에 「{ \\"content\\": 」를 적고 저장한다', async () => {
      await 폼.열기();
      await 폼.적기(주소, ['account.created'], '{ "content": ');
      await 폼.추가제출.click();
      const 오류 = await 폼.오류안내.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await 목록.열기();
      const 없다 = await verify('웹훅이 저장되지 않는다', await 목록.웹훅줄(주소).count(), 0);
      await verify('「페이로드 템플릿」에 문법이 틀린 JSON 을 적고 저장하면 저장되지 않고 오류가 보인다', 오류 && 없다, true);
    });
  } finally {
    await 웹훅정리(page, 주소);
  }
});

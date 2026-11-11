import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 웹훅정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 웹훅상세화면 } from './pages/webhook-detail.page.js';
import { 웹훅폼화면 } from './pages/webhook-form.page.js';
import { 웹훅화면 } from './pages/webhooks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-385',
  name: '이벤트를 0개 켜고 웹훅을 저장하면 저장되지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
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
  const 상세 = new 웹훅상세화면(page);
  const 영주소 = `https://${고유이름('mto')}.example.com/zero`;
  const 일주소 = `https://${고유이름('mto')}.example.com/one`;

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('이벤트를 하나도 켜지 않고 저장한다', async () => {
      await 폼.열기();
      await 폼.적기(영주소, []);
      await 폼.추가제출.click();
      const 오류 = await 폼.오류안내.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await 목록.열기();
      const 없다 = await verify('웹훅이 만들어지지 않는다', await 목록.웹훅줄(영주소).count(), 0);
      await verify('이벤트를 0개 켜고 웹훅을 저장하면 저장되지 않는다', 오류 && 없다, true);
    });

    await test.step('이벤트 account.created 하나만 켜고 저장한다', async () => {
      await 폼.열기();
      await 폼.적기(일주소, ['account.created']);
      await 폼.추가제출.click();
      await 상세.그려질때까지();
      await 목록.열기();
      await verify('이벤트 1개를 켠 웹훅은 만들어진다', await 목록.웹훅줄(일주소).count(), 1);
    });
  } finally {
    await 웹훅정리(page, 영주소);
    await 웹훅정리(page, 일주소);
  }
});

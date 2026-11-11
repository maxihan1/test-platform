import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 웹훅만들기, 웹훅정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 웹훅상세화면 } from './pages/webhook-detail.page.js';
import { 웹훅화면 } from './pages/webhooks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-388',
  name: '케이스 웹훅 URL 을 누르면 상세에 「비활성화」 · 「비밀키 회전」이 보이고 비밀키 서명이 16진수 40자다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 웹훅이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 웹훅화면(page);
  const 상세 = new 웹훅상세화면(page);
  const 주소 = `https://${고유이름('mto')}.example.com/hook`;

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('케이스 웹훅을 만든다', async () => {
      await 웹훅만들기(page, 주소, ['account.created']);
    });

    await test.step('케이스가 만든 웹훅이 있는지 확인한다', async () => {
      await 목록.열기();
      await verify('케이스가 만든 웹훅이 있다', await 목록.웹훅줄(주소).count(), 1, { blocker: true });
    });

    await test.step('목록에서 그 웹훅 URL 을 누른다', async () => {
      await 목록.웹훅링크(주소).click();
      await 상세.그려질때까지();
      const 비활성 = await verify('「비활성화」가 보인다', await 상세.비활성화.isVisible(), true);
      const 회전 = await verify('「비밀키 회전」이 보인다', await 상세.비밀키회전.isVisible(), true);
      const 서명 = await verify('비밀키 서명이 16진수 40자다', /^[0-9a-f]{40}$/.test((await 상세.비밀키서명.innerText()).trim()), true);
      await verify('케이스 웹훅 URL 을 누르면 상세에 「비활성화」 · 「비밀키 회전」이 보이고 비밀키 서명이 16진수 40자다', 비활성 && 회전 && 서명, true);
    });
  } finally {
    await 웹훅정리(page, 주소);
  }
});

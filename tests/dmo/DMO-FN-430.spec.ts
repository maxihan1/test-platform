import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 관리자로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 관리자세션인가, 브라우저, 요청수집, 운영지급쿠폰수 } from './helpers/notify-flow.helper.js';
import { 회원번호 } from './helpers/ops-data.helper.js';
import { 알림쿠폰화면 } from './pages/notify.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-430',
  name: '쿠폰 「주기」를 빠르게 두 번 누르면 그 회원 쿠폰이 한 장만 생긴다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    할인금액: z.number().int().describe('적을 할인 금액 — 1,000~50,000원 · 1,000원 단위').default(5000),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 알림쿠폰화면(page);
  const 알림 = new 토스트(page);
  const 열린창: Page[] = [];

  try {
    let 회원: 일회용회원;
    let 회원쪽: Page;

    await test.step('관리자 계정으로 로그인하고 일회용 회원을 만든다', async () => {
      회원 = await 회원가입(request);
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 알림쿠폰화면.주소);
      회원쪽 = await 회원창(브라우저(page), 회원.loginId, 회원.password);
      열린창.push(회원쪽);
    });

    await test.step('관리자 로그인과 일회용 회원을 확인한다', async () => {
      await 화면.그려질때까지();
      const 로그인 = await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true);
      const 있음 = await verify('일회용 회원이 있다', (await 회원번호(page, 회원.loginId)) > 0, true);
      await verify('관리자 계정으로 로그인해 있고 일회용 회원이 있다', 로그인 && 있음, true, { blocker: true });
    });

    await test.step('쿠폰 「주기」를 빠르게 두 번 누른다', async () => {
      const 수집 = 요청수집(page, '/api/ops/coupons');
      await 화면.쿠폰두번주기(회원.loginId, params.할인금액, 0);
      await 알림.글자('쿠폰을 줬습니다').first().waitFor();
      await 수집.끝날때까지();
      await verify('쿠폰 「주기」를 빠르게 두 번 누르면 그 회원 쿠폰이 한 장만 생긴다', await 운영지급쿠폰수(회원쪽), 1);
    });
  } finally {
    for (const 창 of 열린창) await 창.context().close();
  }
});

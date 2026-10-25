import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 관리자세션인가, 브라우저, 운영지급쿠폰수, 응답기다림 } from './helpers/notify-flow.helper.js';
import { 회원번호 } from './helpers/ops-data.helper.js';
import { 알림쿠폰화면 } from './pages/notify.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-263',
  name: '할인 금액 999원으로 주면 그 회원 쿠폰이 생기지 않는다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    미만금액: z.number().int().describe('1,000원 미만 줄에서 적을 할인 금액 — 0~999원').default(999),
    최소금액: z.number().int().describe('1,000원 줄에서 적을 할인 금액 — 1,000~50,000원 · 1,000원 단위').default(1000),
    최대금액: z.number().int().describe('50,000원 줄에서 적을 할인 금액 — 1,000~50,000원 · 1,000원 단위').default(50000),
    초과금액: z.number().int().describe('50,000원 초과 줄에서 적을 할인 금액 — 50,001~100,000원').default(50001),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 알림쿠폰화면(page);
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

    await test.step('할인 금액 999원으로 「주기」를 누른다', async () => {
      const 전 = await 운영지급쿠폰수(회원쪽);
      const 응답 = 응답기다림(page, '/api/ops/coupons');
      await 화면.쿠폰주기(회원.loginId, params.미만금액, 0);
      await 응답;
      await verify('할인 금액 999원으로 주면 그 회원 쿠폰이 생기지 않는다', (await 운영지급쿠폰수(회원쪽)) - 전, 0);
    });

    await test.step('할인 금액 1,000원으로 「주기」를 누른다', async () => {
      const 전 = await 운영지급쿠폰수(회원쪽);
      const 응답 = 응답기다림(page, '/api/ops/coupons');
      await 화면.쿠폰주기(회원.loginId, params.최소금액, 0);
      await 응답;
      await verify('할인 금액 1,000원으로 주면 그 회원 쿠폰이 한 장 생긴다', (await 운영지급쿠폰수(회원쪽)) - 전, 1);
    });

    await test.step('할인 금액 50,000원으로 「주기」를 누른다', async () => {
      const 전 = await 운영지급쿠폰수(회원쪽);
      const 응답 = 응답기다림(page, '/api/ops/coupons');
      await 화면.쿠폰주기(회원.loginId, params.최대금액, 0);
      await 응답;
      await verify('할인 금액 50,000원으로 주면 그 회원 쿠폰이 한 장 생긴다', (await 운영지급쿠폰수(회원쪽)) - 전, 1);
    });

    await test.step('할인 금액 50,001원으로 「주기」를 누른다', async () => {
      const 전 = await 운영지급쿠폰수(회원쪽);
      const 응답 = 응답기다림(page, '/api/ops/coupons');
      await 화면.쿠폰주기(회원.loginId, params.초과금액, 0);
      await 응답;
      await verify('할인 금액 50,001원으로 주면 그 회원 쿠폰이 생기지 않는다', (await 운영지급쿠폰수(회원쪽)) - 전, 0);
    });
  } finally {
    for (const 창 of 열린창) await 창.context().close();
  }
});

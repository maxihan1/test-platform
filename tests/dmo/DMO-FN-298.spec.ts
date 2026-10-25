import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 관리자세션인가, 담을상품, 브라우저, 응답기다림 } from './helpers/notify-flow.helper.js';
import { 장바구니 as 장바구니읽기, 장바구니담기 } from './helpers/shop-data.helper.js';
import { 시험데이터화면 } from './pages/fixtures.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-298',
  name: '장바구니 칸을 비우고 만들면 그 회원 장바구니가 그대로다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원 장바구니에 상품이 하나 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 시험데이터화면(page);
  const 열린창: Page[] = [];

  try {
    let 회원: 일회용회원;
    let 회원쪽: Page;

    await test.step('관리자 계정으로 로그인하고 일회용 회원 장바구니에 상품을 담는다', async () => {
      회원 = await 회원가입(request);
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 시험데이터화면.주소);
      회원쪽 = await 회원창(브라우저(page), 회원.loginId, 회원.password);
      열린창.push(회원쪽);
      await 장바구니담기(회원쪽, (await 담을상품(page, 50000)).id);
    });

    await test.step('관리자 로그인과 일회용 회원 장바구니를 확인한다', async () => {
      await 화면.그려질때까지();
      const 로그인 = await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true);
      const 담김 = await verify('일회용 회원 장바구니에 상품이 하나 있다', (await 장바구니읽기(회원쪽)).length, 1);
      await verify('관리자 계정으로 로그인해 있고 일회용 회원 장바구니에 상품이 하나 있다', 로그인 && 담김, true, { blocker: true });
    });

    await test.step('장바구니 칸을 비우고 안 읽은 알림 칸에 1을 적고 「만들기」를 누른다', async () => {
      const 전 = JSON.stringify(await 장바구니읽기(회원쪽));
      const 응답 = 응답기다림(page, '/api/ops/fixtures');
      await 화면.만들기누르기(회원.loginId, { 장바구니: null, 안읽은알림: 1 });
      await 응답;
      await verify('장바구니 칸을 비우고 만들면 그 회원 장바구니가 그대로다', JSON.stringify(await 장바구니읽기(회원쪽)), 전);
    });
  } finally {
    for (const 창 of 열린창) await 창.context().close();
  }
});

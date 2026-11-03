import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 쇼핑몰머리줄 } from './components/shop-header.component.js';
import { 관리자로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 관리자세션인가, 내주문, 브라우저, 응답기다림, 주문정리 } from './helpers/notify-flow.helper.js';
import { 회원번호 } from './helpers/ops-data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 시험데이터화면 } from './pages/fixtures.page.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-316',
  name: '만든 주문이 그 회원 주문 내역에 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다'],
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

    await test.step('관리자 계정으로 로그인하고 일회용 회원을 만든다', async () => {
      회원 = await 회원가입(request);
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 시험데이터화면.주소);
      열린창.push(await 회원창(브라우저(page), 회원.loginId, 회원.password));
    });

    await test.step('관리자 로그인과 일회용 회원을 확인한다', async () => {
      await 화면.그려질때까지();
      const 로그인 = await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true);
      const 있음 = await verify('일회용 회원이 있다', (await 회원번호(page, 회원.loginId)) > 0, true);
      await verify('관리자 계정으로 로그인해 있고 일회용 회원이 있다', 로그인 && 있음, true, { blocker: true });
    });

    await test.step('결제완료 주문 1 · 장바구니 1 · 안 읽은 알림 1로 만든 뒤 그 회원 주문 내역을 연다', async () => {
      const 회원쪽 = 열린창[0]!;
      const 응답 = 응답기다림(page, '/api/ops/fixtures');
      await 화면.만들기누르기(회원.loginId, { 결제완료: 1, 장바구니: 1, 안읽은알림: 1 });
      await 응답;
      const 주문번호 = (await 내주문(회원쪽))[0]!.id;
      const 주문내역 = new 주문내역화면(회원쪽);
      await 주문내역.열기();
      await verify('만든 주문이 그 회원 주문 내역에 보인다', await 주문내역.주문줄(주문번호).isVisible(), true);
    });

    await test.step('그 회원 장바구니를 연다', async () => {
      const 장바구니 = new 장바구니화면(열린창[0]!);
      await 장바구니.열기();
      await verify('그 회원 장바구니에 상품 1개가 보인다', await 장바구니.상품링크.count(), 1);
    });

    await test.step('그 회원 머리줄 종을 누른다', async () => {
      const 머리줄 = new 쇼핑몰머리줄(열린창[0]!);
      await 머리줄.종건수.waitFor();
      await 머리줄.종열기();
      await verify('그 회원 종 목록에 안 읽은 알림이 보인다', await 머리줄.안읽은알림.count(), 1);
    });
  } finally {
    try {
      if (열린창[0]) await 주문정리(page, (await 내주문(열린창[0])).map((주문) => 주문.id));
    } finally {
      for (const 창 of 열린창) await 창.context().close();
    }
  }
});

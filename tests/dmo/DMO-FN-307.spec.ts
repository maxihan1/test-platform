import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 관리자세션인가, 내주문, 브라우저, 응답기다림, 재고표, 주문정리 } from './helpers/notify-flow.helper.js';
import { 주문상세읽기, 회원번호 } from './helpers/ops-data.helper.js';
import { 시험데이터화면 } from './pages/fixtures.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-307',
  name: '결제완료 주문 1건을 만들면 그 주문 상세에 수량 1이 보인다',
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
    let 상세: Awaited<ReturnType<typeof 주문상세읽기>>;
    let 첫상품번호 = 0;
    let 전재고 = new Map<number, number>();
    let 후재고 = new Map<number, number>();

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

    await test.step('결제완료 주문 칸에 1을 적고 「만들기」를 누른 뒤 그 주문 상세를 연다', async () => {
      전재고 = await 재고표(page);
      첫상품번호 = [...전재고.entries()].filter(([, 재고]) => 재고 > 0).map(([번호]) => 번호).sort((a, b) => a - b)[0] ?? 0;
      const 응답 = 응답기다림(page, '/api/ops/fixtures');
      await 화면.만들기누르기(회원.loginId, { 결제완료: 1 });
      await 응답;
      후재고 = await 재고표(page);
      const 주문 = (await 내주문(열린창[0]!))[0]!;
      상세 = await 주문상세읽기(page, 주문.id);
      await verify('결제완료 주문 1건을 만들면 그 주문 상세에 수량 1이 보인다', 상세.lines[0]?.qty, 1);
    });

    await test.step('만든 주문 상세의 결제수단을 읽는다', async () => {
      await verify('만든 주문 상세에 결제수단 「계좌이체」가 보인다', 상세.payment.method, '계좌이체');
    });

    await test.step('만든 주문 상세의 배송지를 읽는다', async () => {
      await verify('만든 주문 상세에 배송지 「서울 강남구 테헤란로 123」이 보인다', 상세.shipping.address, '서울 강남구 테헤란로 123');
    });

    await test.step('만든 주문의 상품 재고를 읽는다', async () => {
      const 상품번호 = 상세.lines[0]?.productId ?? 0;
      await verify('만든 주문의 상품 재고가 1 줄어든다', 후재고.get(상품번호), (전재고.get(상품번호) ?? Number.NaN) - 1);
    });

    await test.step('만든 주문의 상품 번호를 읽는다', async () => {
      await verify('만든 주문의 상품이 재고가 있는 상품 가운데 번호가 가장 앞선 상품이다', 상세.lines[0]?.productId, 첫상품번호);
    });
  } finally {
    try {
      if (열린창[0]) await 주문정리(page, (await 내주문(열린창[0])).map((주문) => 주문.id));
    } finally {
      for (const 창 of 열린창) await 창.context().close();
    }
  }
});

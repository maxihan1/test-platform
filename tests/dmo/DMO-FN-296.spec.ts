import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 관리자세션인가, 내주문, 브라우저, 응답기다림, 주문정리 } from './helpers/notify-flow.helper.js';
import { 회원번호 } from './helpers/ops-data.helper.js';
import { 시험데이터화면 } from './pages/fixtures.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-296',
  name: '결제완료 주문 칸을 5로 만들면 그 회원 결제완료 주문이 5건 생긴다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    최대개수: z.number().int().describe('5건 줄에서 적을 결제완료 주문 개수 — 1~5').default(5),
    초과개수: z.number().int().describe('한도를 넘겨 적을 결제완료 주문 개수 — 6~10').default(6),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 시험데이터화면(page);
  const 열린창: Page[] = [];

  try {
    let 회원: 일회용회원;
    let 회원쪽: Page;
    const 결제완료수 = async (): Promise<number> => (await 내주문(회원쪽)).filter((주문) => 주문.status === '결제완료').length;

    await test.step('관리자 계정으로 로그인하고 일회용 회원을 만든다', async () => {
      회원 = await 회원가입(request);
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 시험데이터화면.주소);
      회원쪽 = await 회원창(브라우저(page), 회원.loginId, 회원.password);
      열린창.push(회원쪽);
    });

    await test.step('관리자 로그인과 일회용 회원을 확인한다', async () => {
      await 화면.그려질때까지();
      const 로그인 = await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true);
      const 있음 = await verify('일회용 회원이 있다', (await 회원번호(page, 회원.loginId)) > 0, true);
      await verify('관리자 계정으로 로그인해 있고 일회용 회원이 있다', 로그인 && 있음, true, { blocker: true });
    });

    await test.step('결제완료 주문 칸에 5를 적고 「만들기」를 누른다', async () => {
      const 전 = await 결제완료수();
      const 응답 = 응답기다림(page, '/api/ops/fixtures');
      await 화면.만들기누르기(회원.loginId, { 결제완료: params.최대개수 });
      await 응답;
      await verify('결제완료 주문 칸을 5로 만들면 그 회원 결제완료 주문이 5건 생긴다', (await 결제완료수()) - 전, params.최대개수);
    });

    await test.step('결제완료 주문 칸에 6을 적고 「만들기」를 누른다', async () => {
      const 전 = await 결제완료수();
      const 응답 = 응답기다림(page, '/api/ops/fixtures');
      await 화면.만들기누르기(회원.loginId, { 결제완료: params.초과개수 });
      await 응답;
      await verify('결제완료 주문 칸을 6으로 만들면 주문이 생기지 않는다', (await 결제완료수()) - 전, 0);
    });
  } finally {
    try {
      if (열린창[0]) await 주문정리(page, (await 내주문(열린창[0])).map((주문) => 주문.id));
    } finally {
      for (const 창 of 열린창) await 창.context().close();
    }
  }
});

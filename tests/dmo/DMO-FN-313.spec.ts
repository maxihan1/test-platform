import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 관리자세션인가, 내주문, 브라우저, 주문정리 } from './helpers/notify-flow.helper.js';
import { 회원번호 } from './helpers/ops-data.helper.js';
import { 시험데이터화면 } from './pages/fixtures.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-313',
  name: '「만들기」를 누르면 결과 줄에 만든 것 요약과 주문번호가 보인다',
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

    await test.step('결제완료 주문 칸에 1을 적고 「만들기」를 누른다', async () => {
      await 화면.만들기누르기(회원.loginId, { 결제완료: 1 });
      await 화면.결과줄.getByText('만들었습니다', { exact: true }).waitFor();
      const 주문번호 = (await 내주문(열린창[0]!))[0]!.id;
      const 요약 = await verify('만든 것 요약이 보인다', await 화면.결과줄.getByText('결제완료 주문 1', { exact: true }).isVisible(), true);
      const 번호 = await verify('주문번호가 보인다', await 화면.결과줄.getByText(주문번호, { exact: true }).isVisible(), true);
      await verify('「만들기」를 누르면 결과 줄에 만든 것 요약과 주문번호가 보인다', 요약 && 번호, true);
    });
  } finally {
    try {
      if (열린창[0]) await 주문정리(page, (await 내주문(열린창[0])).map((주문) => 주문.id));
    } finally {
      for (const 창 of 열린창) await 창.context().close();
    }
  }
});

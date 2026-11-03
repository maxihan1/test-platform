import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 쇼핑몰머리줄 } from './components/shop-header.component.js';
import { API로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import { 두프레임기다리기, 로그인한아이디, 받은알림, 브라우저 } from './helpers/notify-flow.helper.js';
import { 알림보내기 } from './helpers/ops-data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-250',
  name: '운영툴에서 보낸 알림을 눌러도 화면 주소가 바뀌지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원에게 운영툴로 알림을 보냈고 그 회원으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    내용: z.string().describe('보낼 알림 내용 — 1~100자').default('시험 알림입니다'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 머리줄 = new 쇼핑몰머리줄(page);
  const 장바구니 = new 장바구니화면(page);
  const 열린창: Page[] = [];

  try {
    let 로그인아이디 = '';

    await test.step('일회용 회원에게 운영툴로 알림을 보내고 그 회원으로 로그인한다', async () => {
      const 회원 = await 회원가입(request);
      로그인아이디 = 회원.loginId;
      const 관리자창 = await 회원창(브라우저(page), params.adminId ?? '', params.adminPassword ?? '');
      열린창.push(관리자창);
      await 알림보내기(관리자창, 회원.loginId, params.내용);
      await API로그인(page, 회원.loginId, 회원.password);
      await 장바구니.열기();
    });

    await test.step('보낸 알림과 로그인을 확인한다', async () => {
      const 보냄 = await verify('일회용 회원에게 운영툴로 알림을 보냈다', (await 받은알림(page)).includes(params.내용), true);
      const 로그인 = await verify('그 회원으로 로그인해 있다', (await 로그인한아이디(page)) === 로그인아이디, true);
      await verify('일회용 회원에게 운영툴로 알림을 보냈고 그 회원으로 로그인해 있다', 보냄 && 로그인, true, { blocker: true });
    });

    await test.step('종 목록에서 그 알림을 누른다', async () => {
      await 머리줄.종건수.waitFor();
      await 머리줄.종열기();
      const 누르기전주소 = page.url();
      await 머리줄.알림(params.내용).click();
      await 두프레임기다리기(page);
      await verify('운영툴에서 보낸 알림을 눌러도 화면 주소가 바뀌지 않는다', page.url(), 누르기전주소);
    });
  } finally {
    for (const 창 of 열린창) await 창.context().close();
  }
});

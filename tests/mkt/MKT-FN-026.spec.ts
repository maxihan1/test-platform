import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-026',
  name: '「주문 내역 내려받기」를 누르면 날짜가 든 이름의 주문 파일이 내려받아진다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인폼(page);
  const 관리자 = new 관리자화면(page);

  await test.step('로그인 화면에서 관리자로 로그인한다', async () => {
    await 홈.쿠키띠를치운다();
    await 홈.공지팝업을치운다();
    await 홈.설문을치운다();
    await 로그인.로그인한다(params.adminId, params.adminPassword ?? '');
    await verify('머리글에 「로그아웃」이 보인다', await 머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('관리자 화면에서 「주문 내역 내려받기」를 누른다', async () => {
    await 관리자.열기();
    await 관리자.설정탭을연다();
    const [내려받기] = await Promise.all([page.waitForEvent('download'), 관리자.주문내려받기.click()]);
    const 조각: Buffer[] = [];
    for await (const 덩어리 of await 내려받기.createReadStream()) 조각.push(Buffer.from(덩어리));
    const 첫줄 = Buffer.concat(조각).toString('utf8').replace(/^﻿/, '').split(/\r?\n/)[0];
    const 오늘 = new Date();
    const 두자리 = (값: number): string => String(값).padStart(2, '0');
    await verify(
      '「주문 내역 내려받기」를 누르면 orders-{오늘 날짜 8자리}.csv 파일이 내려받아진다',
      내려받기.suggestedFilename(),
      `orders-${오늘.getFullYear()}${두자리(오늘.getMonth() + 1)}${두자리(오늘.getDate())}.csv`,
    );
    await verify('내려받은 주문 파일의 첫 줄은 「주문번호,주문일,아이디,결제금액,상태」다', 첫줄, '주문번호,주문일,아이디,결제금액,상태');
  });
});

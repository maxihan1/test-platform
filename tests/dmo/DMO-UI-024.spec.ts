import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 주문관리화면 } from './pages/orders.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-024',
  name: '주문 관리 화면 표에 주문번호 · 주문일 · 아이디 · 상품 · 결제 금액 · 상태 열이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 주문관리화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 화면.틀.머리줄.waitFor();
    await verify('관리자 계정으로 로그인해 있다', await 화면.틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('/ops/orders 를 연다', async () => {
    await 화면.열기();
    const 열들 = (await 화면.열머리글.allInnerTexts()).filter((글) => 글 !== '');
    await verify('주문 관리 화면 표에 주문번호 · 주문일 · 아이디 · 상품 · 결제 금액 · 상태 열이 보인다', 열들.join(' · '), '주문번호 · 주문일 · 아이디 · 상품 · 결제 금액 · 상태');
  });
});

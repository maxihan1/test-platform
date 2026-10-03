import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { Page } from '@playwright/test';

import { 로그인폼 } from './components/login-form.component.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

interface 주문요약 {
  id: string;
  status: string;
}

async function 주문목록(page: Page): Promise<주문요약[]> {
  const 응답 = await page.request.get('/api/orders?period=all');
  return ((await 응답.json()) as { items: 주문요약[] }).items;
}

export const spec = defineCase({
  tcId: 'MKT-UI-014',
  name: '주문 상세에 상품 · 배송 · 결제 · 상태가 보이고 「주문 취소」 버튼은 「결제완료」 주문에만 보인다',
  precondition: [
    '주문이 있는 회원 계정으로 로그인해 있다',
    '「결제완료」 주문이 있는 회원 계정으로 로그인해 있다',
    '「배송중」 주문이 있는 회원 계정으로 로그인해 있다',
  ],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    shown: z.boolean().describe('보이는지').default(true),
    notShown: z.boolean().describe('보이는지').default(false),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 주문상세화면(page);
  let 결제완료: string | undefined;
  let 배송중: string | undefined;

  await test.step('회원 계정으로 로그인해 주문 번호를 찾는다', async () => {
    await new 로그인폼(page).로그인한다(params.loginId, params.password ?? '');
    const 목록 = await 주문목록(page);
    결제완료 = 목록.find((주문) => 주문.status === '결제완료')?.id;
    배송중 = 목록.find((주문) => 주문.status === '배송중')?.id;
    await verify('「결제완료」 주문이 있는 회원 계정으로 로그인해 있다', 결제완료 !== undefined && 배송중 !== undefined, expected.shown, { blocker: true });
  });

  await test.step('주문 상세 화면을 연다', async () => {
    await 상세.열기(결제완료 ?? '');
    const 칸들 = [상세.상품목록제목, 상세.배송정보제목, 상세.결제정보제목, 상세.주문상태이름];
    await verify('주문 상세에 상품 목록 · 배송지 · 결제 정보 · 상태가 보인다', (await Promise.all(칸들.map((칸) => 칸.isVisible()))).every(Boolean), expected.shown);
  });

  await test.step('「결제완료」 주문의 상세 화면을 연다', async () => {
    await 상세.열기(결제완료 ?? '');
    await verify('「결제완료」 주문의 상세에는 「주문 취소」 버튼이 보인다', await 상세.주문취소버튼.isVisible(), expected.shown);
  });

  await test.step('「배송중」 주문의 상세 화면을 연다', async () => {
    await 상세.열기(배송중 ?? '');
    await verify('「배송중」 주문의 상세에는 「주문 취소」 버튼이 보이지 않는다', await 상세.주문취소버튼.isVisible(), expected.notShown);
  });
});

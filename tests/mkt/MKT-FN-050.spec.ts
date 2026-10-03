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
  tcId: 'MKT-FN-050',
  name: '취소 사유 입력칸에 201자를 적으면 200자까지만 남는다',
  precondition: ['「결제완료」 주문이 있는 회원 계정으로 로그인해 있다'],
  unconfirmed: '기획서와 다름 — 차이 D7: 취소 사유 입력칸의 200자 제한이 기획서에 없다 (작성 요청 5873)',
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    shown: z.boolean().describe('보이는지').default(true),
    kept: z.number().describe('남는 글자 수').default(200),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 주문상세화면(page);
  let 결제완료: string | undefined;

  await test.step('회원 계정으로 로그인해 취소 모달을 연다', async () => {
    await new 로그인폼(page).로그인한다(params.loginId, params.password ?? '');
    결제완료 = (await 주문목록(page)).find((주문) => 주문.status === '결제완료')?.id;
    await verify('「결제완료」 주문이 있는 회원 계정으로 로그인해 있다', 결제완료 !== undefined, expected.shown, { blocker: true });
    await 상세.열기(결제완료 ?? '');
    await 상세.취소모달을연다();
    await 상세.사유를고른다('기타');
    await 상세.사유입력.waitFor();
  });

  await test.step('취소 사유 「기타」의 입력칸에 201자를 적는다', async () => {
    await 상세.사유입력.fill('가'.repeat(201));
    await verify('취소 사유 입력칸에 201자를 적으면 200자까지만 남는다', (await 상세.사유입력.inputValue()).length, expected.kept);
  });
});

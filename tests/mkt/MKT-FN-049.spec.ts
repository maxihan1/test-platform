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
  tcId: 'MKT-FN-049',
  name: '「주문 취소」를 누르면 취소 사유를 고르는 모달이 뜨고 사유를 비우면 주문이 취소되지 않는다',
  precondition: ['「결제완료」 주문이 있는 회원 계정으로 로그인해 있다', '주문 취소 요청은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    reasons: z.string().describe('취소 사유 목록').default('단순 변심, 상품 정보 상이, 배송 지연, 기타'),
    shown: z.boolean().describe('보이는지').default(true),
    requests: z.number().describe('취소 요청 수').default(0),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 주문상세화면(page);
  const 막을주소 = '**/api/orders/*/cancel';
  let 결제완료: string | undefined;
  let 취소요청수 = 0;

  await page.context().route(막을주소, async (경로) => {
    취소요청수 += 1;
    await 경로.abort();
  });

  try {
    await test.step('회원 계정으로 로그인해 주문 번호를 찾는다', async () => {
      await new 로그인폼(page).로그인한다(params.loginId, params.password ?? '');
      결제완료 = (await 주문목록(page)).find((주문) => 주문.status === '결제완료')?.id;
      await verify('「결제완료」 주문이 있는 회원 계정으로 로그인해 있다', 결제완료 !== undefined, expected.shown, { blocker: true });
    });

    await test.step('주문 상세에서 「주문 취소」를 누른다', async () => {
      await 상세.열기(결제완료 ?? '');
      await 상세.취소모달을연다();
      await verify('「주문 취소」를 누르면 모달에서 취소 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」를 고를 수 있다', (await 상세.사유옵션들.allInnerTexts()).join(', '), expected.reasons);
    });

    await test.step('취소 모달에서 취소 사유 「기타」를 고른다', async () => {
      await 상세.사유를고른다('기타');
      await 상세.사유입력.waitFor();
      await verify('취소 사유 「기타」를 고르면 사유 입력칸이 나온다', await 상세.사유입력.isVisible(), expected.shown);
    });

    await test.step('취소 사유 「기타」를 고르고 사유를 비운 채 「취소 신청」을 누른다', async () => {
      await 상세.취소신청버튼.click();
      await 상세.모달오류.waitFor();
      await verify('사유 입력칸을 비운 채 「취소 신청」을 누르면 주문이 취소되지 않는다', 취소요청수, expected.requests);
    });
  } finally {
    await page.context().unroute(막을주소);
  }
});

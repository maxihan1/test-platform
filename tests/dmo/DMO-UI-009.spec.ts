import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-009',
  name: '대시보드에 회원 수(잠긴 회원 수) · 오늘 주문 · 주문 상태별 건수 · 답변 대기 문의 · 품절 상품 · 불안정 모드 카드가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);

  await test.step('관리자 계정으로 로그인해 있음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
  });

  await test.step('/ops 를 연다', async () => {
    await 대시보드.열기();
    const 회원수 = await verify('회원 수(잠긴 회원 수) 카드가 보인다', await 대시보드.회원수카드.isVisible(), true);
    const 오늘주문 = await verify('오늘 주문 카드가 보인다', await 대시보드.오늘주문카드.isVisible(), true);
    const 결제완료 = await verify('주문 상태별 건수에 「결제완료」 카드가 보인다', await 대시보드.상태카드('결제완료').isVisible(), true);
    const 배송중 = await verify('주문 상태별 건수에 「배송중」 카드가 보인다', await 대시보드.상태카드('배송중').isVisible(), true);
    const 배송완료 = await verify('주문 상태별 건수에 「배송완료」 카드가 보인다', await 대시보드.상태카드('배송완료').isVisible(), true);
    const 주문취소 = await verify('주문 상태별 건수에 「주문취소」 카드가 보인다', await 대시보드.상태카드('주문취소').isVisible(), true);
    const 답변대기 = await verify('답변 대기 문의 카드가 보인다', await 대시보드.답변대기카드.isVisible(), true);
    const 품절 = await verify('품절 상품 카드가 보인다', await 대시보드.품절카드.isVisible(), true);
    const 불안정 = await verify('불안정 모드 카드가 보인다', await 대시보드.불안정모드카드.isVisible(), true);
    await verify(
      '대시보드에 회원 수(잠긴 회원 수) · 오늘 주문 · 주문 상태별 건수 · 답변 대기 문의 · 품절 상품 · 불안정 모드 카드가 보인다',
      회원수 && 오늘주문 && 결제완료 && 배송중 && 배송완료 && 주문취소 && 답변대기 && 품절 && 불안정,
      true,
    );
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-141',
  name: '대시보드 버튼 반응',
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

  await test.step('회원 수 카드를 누른다', async () => {
    await 대시보드.열기();
    await 대시보드.회원수카드.click();
    await 대시보드.이동끝날때까지('회원');
    await verify('대시보드에서 회원 수 카드를 누르면 회원 관리 화면으로 간다', await 대시보드.도착제목('회원 관리').isVisible(), true);
  });

  await test.step('오늘 주문 카드를 누른다', async () => {
    await 대시보드.열기();
    await 대시보드.오늘주문카드.click();
    await 대시보드.이동끝날때까지('주문');
    await verify('대시보드에서 오늘 주문 카드를 누르면 주문 관리 화면으로 간다', await 대시보드.도착제목('주문 관리').isVisible(), true);
  });

  await test.step('「배송중」 카드를 누른다', async () => {
    await 대시보드.열기();
    await 대시보드.상태카드('배송중').click();
    await 대시보드.이동끝날때까지('주문');
    const 주문관리 = await verify('주문 관리 화면으로 간다', await 대시보드.도착제목('주문 관리').isVisible(), true);
    const 배송중으로거름 = await verify('주문 관리 화면이 배송중으로 걸러진다', await 대시보드.거른상태칩('배송중').isVisible(), true);
    await verify('대시보드에서 「배송중」 카드를 누르면 배송중으로 거른 주문 관리 화면으로 간다', 주문관리 && 배송중으로거름, true);
  });

  await test.step('답변 대기 문의 카드를 누른다', async () => {
    await 대시보드.열기();
    await 대시보드.답변대기카드.click();
    await 대시보드.이동끝날때까지('문의');
    await verify('대시보드에서 답변 대기 문의 카드를 누르면 문의 관리 화면으로 간다', await 대시보드.도착제목('문의 관리').isVisible(), true);
  });

  await test.step('품절 상품 카드를 누른다', async () => {
    await 대시보드.열기();
    await 대시보드.품절카드.click();
    await 대시보드.이동끝날때까지('상품');
    await verify('대시보드에서 품절 상품 카드를 누르면 상품 관리 화면으로 간다', await 대시보드.도착제목('상품 관리').isVisible(), true);
  });

  await test.step('불안정 모드 카드를 누른다', async () => {
    await 대시보드.열기();
    await 대시보드.불안정모드카드.click();
    await 대시보드.이동끝날때까지('환경');
    await verify('대시보드에서 불안정 모드 카드를 누르면 환경 화면으로 간다', await 대시보드.도착제목('환경').isVisible(), true);
  });
});

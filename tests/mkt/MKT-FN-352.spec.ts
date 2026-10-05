import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 테스트계정값 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-352',
  name: '주문을 누르면 그 주문의 주문 상세 화면으로 간다',
  precondition: ['테스트 계정 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 계정 = 테스트계정값(params);
  const 목록 = new 주문내역화면(page);
  const 상세 = new 주문상세화면(page);
  const 헤더 = new 머리글(page);

  await test.step('로그인 요청으로 테스트 계정에 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('테스트 계정 회원으로 로그인해 있는지 확인한다', async () => {
    await 안내창끄기(page);
    await page.goto('/');
    await 헤더.로그아웃버튼.waitFor();
    await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
  });

  await test.step('주문 내역에서 첫 주문 줄을 누른다', async () => {
    await 목록.열기();
    const 누른번호 = await 목록.첫줄누르기();
    await 상세.불러오기기다리기();
    await verify(
      '주문을 누르면 그 주문의 주문 상세 화면으로 간다',
      { 상세화면: await 상세.제목.isVisible(), 주문번호: await 상세.항목값('주문번호') },
      { 상세화면: true, 주문번호: 누른번호 },
    );
    await verify(
      '주문 상세에 상품 목록 · 배송지 · 결제 정보 · 상태가 보인다',
      [await 상세.상품제목.isVisible(), await 상세.배송제목.isVisible(), await 상세.결제제목.isVisible(), await 상세.상태항목.isVisible()],
      [true, true, true, true],
    );
  });
});

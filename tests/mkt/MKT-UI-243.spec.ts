import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상태별주문번호 } from './helpers/my-page.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-243',
  name: '주문 상세에 상품 목록 · 배송지 · 결제 정보 · 상태가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문상세 = new 주문상세화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('주문 상세 화면을 연다', async () => {
    await 주문상세.열기(await 상태별주문번호(page.request, '배송중'));
  });

  await test.step('주문 상세가 열렸는지 확인한다', async () => {
    await verify('주문 상세 제목이 보인다', await 주문상세.주문번호값.first().isVisible(), true, { blocker: true });
  });

  await test.step('주문 상세를 확인한다', async () => {
    const 상품목록 = (await 주문상세.상품표.getByRole('row').count()) > 1;
    const 배송지 = await 주문상세.배송제목.isVisible();
    const 결제정보 = await 주문상세.결제제목.isVisible();
    const 상태 = await 주문상세.상태값.first().isVisible();
    await verify('주문 상세에 상품 목록 · 배송지 · 결제 정보 · 상태가 보인다', { 상품목록, 배송지, 결제정보, 상태 }, { 상품목록: true, 배송지: true, 결제정보: true, 상태: true });
  });
});

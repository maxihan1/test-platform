import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

type 주문요약 = { id: string; status: string };

export const spec = defineCase({
  tcId: 'MKT-FN-035',
  name: '주문 내역의 주문을 누르면 주문 상세 화면에 상품 목록 · 배송지 · 결제 정보 · 상태가 보인다',
  precondition: ['주문이 있는 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user1'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 머리 = new 머리글(page);
  const 목록 = new 주문내역화면(page);
  const 상세 = new 주문상세화면(page);
  await page.request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '' } });
  const 주문들 = (await (await page.request.get('/api/orders?period=all')).json()).items as 주문요약[];
  const 주문번호 = 주문들[0]?.id ?? '';

  await test.step('주문 내역의 주문 하나를 누른다', async () => {
    await 목록.열기();
    await 머리.로그아웃버튼().waitFor();
    await 목록.주문번호링크(주문번호).waitFor();
    await verify('주문이 있는 회원으로 로그인해 있다', await 목록.주문번호링크(주문번호).isVisible(), true, { blocker: true });
    await 목록.주문번호누르기(주문번호);
    await 상세.상품목록제목().waitFor();
    await verify(
      '주문을 누르면 주문 상세 화면에 상품 목록이 보인다',
      [await 상세.상품목록().isVisible(), (await 상세.상품행들().count()) > 0],
      [true, true],
    );
    await verify(
      '주문 상세 화면에 배송지 · 결제 정보 · 상태가 보인다',
      [await 상세.배송정보제목().isVisible(), await 상세.결제정보제목().isVisible(), await 상세.상태글자().isVisible()],
      [true, true, true],
    );
  });
});

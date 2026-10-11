import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-272',
  name: '주문 상세에 상품 목록 · 배송지 · 결제 정보 · 상태가 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 내주문상세화면(page);
  const 계정 = 계정값(params);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('회원으로 로그인했는지 확인한다', async () => {
    await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 계정.loginId, true, { blocker: true });
  });

  await test.step('내 주문 상세를 연다', async () => {
    const 목록 = (await (await page.request.get('/api/orders?period=all')).json()) as { items: { id: string }[] };
    await 상세.열기(목록.items[0]?.id ?? '');
    await 상세.상태배지.waitFor();
    await verify('주문 상세에 상품 목록 · 배송지 · 결제 정보 · 상태가 보인다', [await 상세.상품목록제목.isVisible(), await 상세.배송정보제목.isVisible(), await 상세.결제정보제목.isVisible(), await 상세.주문상태이름.isVisible()].every(Boolean), true);
  });
});

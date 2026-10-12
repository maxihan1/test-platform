import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, 로그인한아이디, 테스트계정으로로그인 } from './helpers/account.helper.js';
import { 상태별주문번호 } from './helpers/order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-392',
  name: '배송중 주문의 상세를 열면 「주문 취소」 버튼이 보이지 않는다',
  precondition: ['테스트 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['결정 테이블', '상태 전이'],
});

test(spec, async ({ page, params }) => {
  const 상세 = new 내주문상세화면(page);

  await test.step('테스트 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await 테스트계정으로로그인(page.request, params);
  });

  await test.step('테스트 계정으로 로그인했는지 확인한다', async () => {
    await verify('테스트 계정으로 로그인해 있다', await 로그인한아이디(page.request), 계정값(params).loginId, { blocker: true });
  });

  await test.step('배송중 주문의 상세를 연다', async () => {
    const 주문번호 = await 상태별주문번호(page.request, '배송중');
    await 상세.열기(주문번호);
    await 상세.주문번호표시(주문번호).waitFor();
    await verify('주문 상세 화면이 열려 있다', 경로(page), `/my/orders/${주문번호}`, { blocker: true });
    await verify('배송중 주문의 상세를 열면 「주문 취소」 버튼이 보이지 않는다', await 상세.주문취소.isVisible(), false);
  });
});

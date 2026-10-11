import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 결제완료주문번호, 배송중주문번호 } from './helpers/member.helper.js';
import { 주문상세화면 } from './pages/my-order.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-108',
  name: '「배송중」 주문 상세에는 「주문 취소」 버튼이 보이지 않는다',
  platforms: ['desktop'],
  precondition: [
    '회원으로 로그인해 있다',
  ],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 주문상세화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('회원으로 로그인한다', async () => {
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await 머리.로그아웃버튼.waitFor();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('배송중 주문 상세 화면을 연다', async () => {
    await 상세.열기(배송중주문번호);
    await 상세.상태배지.filter({ hasText: '배송중' }).waitFor();
    await verify('「배송중」 주문 상세에는 「주문 취소」 버튼이 보이지 않는다', await 상세.주문취소버튼.isVisible(), false);
  });

  await test.step('결제완료 주문 상세 화면을 연다', async () => {
    await 상세.열기(결제완료주문번호);
    await 상세.상태배지.filter({ hasText: '결제완료' }).waitFor();
    await verify('「결제완료」 주문 상세에는 「주문 취소」 버튼이 보인다', await 상세.주문취소버튼.isVisible(), true);
  });
});

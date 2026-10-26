import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한아이디, 상태별주문번호 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-280',
  name: '「결제완료」 주문 상세에 「주문 취소」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 주문상세화면(page);
  let 주문번호 = '';

  await test.step('회원으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.loginId, params.loginPassword);
    주문번호 = await 상태별주문번호(page.request, '결제완료');
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('결제완료 주문의 상세를 연다', async () => {
    await 상세.열기(주문번호);
    await verify('주문 상세 화면이 보인다', await 상세.큰제목.isVisible(), true, { blocker: true });
    await verify('「결제완료」 주문 상세에 「주문 취소」 버튼이 보인다', await 상세.주문취소버튼.isVisible(), true);
  });
});

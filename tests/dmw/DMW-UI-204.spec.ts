import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한아이디, 상태별주문번호 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-204',
  name: '주문 내역에서 주문을 누르면 그 주문 상세가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 주문내역화면(page);
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

  await test.step('주문 내역 화면을 연다', async () => {
    await 목록.열기();
    await verify('주문 내역 화면이 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('주문 내역의 주문번호를 누른다', async () => {
    await 목록.주문번호누르기(주문번호);
    await 상세.그려질때까지();
    const 제목 = await verify('주문 상세 화면이 보인다', await 상세.큰제목.isVisible(), true);
    const 번호 = await verify('누른 주문의 주문번호가 보인다', await page.getByText(주문번호, { exact: true }).isVisible(), true);
    await verify('주문 내역에서 주문을 누르면 그 주문 상세가 보인다', 제목 && 번호, true);
  });

  await test.step('주문 상세 내용을 확인한다', async () => {
    const 상품 = await verify('주문 상세에 상품 목록이 보인다', await 상세.주문상품제목.isVisible(), true);
    const 배송지 = await verify('주문 상세에 배송지가 보인다', await 상세.배송정보제목.isVisible(), true);
    const 결제 = await verify('주문 상세에 결제 정보가 보인다', await 상세.결제정보제목.isVisible(), true);
    const 상태 = await verify('주문 상세에 상태가 보인다', await 상세.상태.isVisible(), true);
    await verify('주문 상세에 상품 목록 · 배송지 · 결제 정보 · 상태가 보인다', 상품 && 배송지 && 결제 && 상태, true);
  });
});

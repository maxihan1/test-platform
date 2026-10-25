import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입 } from './helpers/account.helper.js';
import { 주문하나 } from './helpers/orders-flow.helper.js';
import { 주문관리화면 } from './pages/orders.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-108',
  name: '배송완료 주문 줄에는 상태 드롭다운이 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '관리자 계정으로 로그인해 있고 일회용 회원에게 배송완료 주문이 있다',
    '관리자 계정으로 로그인해 있고 일회용 회원에게 주문취소 주문이 있다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 주문관리화면(page);
  const 회원 = { loginId: '' };
  let 배송완료 = '';
  let 주문취소 = '';

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 화면.틀.머리줄.waitFor();
    await verify('관리자 계정으로 로그인해 있다', await 화면.틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('일회용 회원에게 배송완료 주문과 주문취소 주문을 만든다', async () => {
    회원.loginId = (await 회원가입(request)).loginId;
    배송완료 = await 주문하나(page, 회원.loginId, '배송완료');
    주문취소 = await 주문하나(page, 회원.loginId, '주문취소');
  });

  await test.step('만든 배송완료 주문과 주문취소 주문이 주문 관리 화면에 보이는지 확인한다', async () => {
    await 화면.열기();
    await 화면.주문줄(배송완료).waitFor();
    await 화면.주문줄(주문취소).waitFor();
    await verify('일회용 회원에게 배송완료 주문이 있다', await 화면.상태글자(배송완료), '배송완료', { blocker: true });
    await verify('일회용 회원에게 주문취소 주문이 있다', await 화면.상태글자(주문취소), '주문취소', { blocker: true });
  });

  await test.step('배송완료 주문 줄을 찾는다', async () => {
    await verify('배송완료 주문 줄에는 상태 드롭다운이 보이지 않는다', await 화면.상태드롭다운(배송완료).isVisible(), false);
  });

  await test.step('주문취소 주문 줄을 찾는다', async () => {
    await verify('주문취소 주문 줄에는 상태 드롭다운이 보이지 않는다', await 화면.상태드롭다운(주문취소).isVisible(), false);
  });
});

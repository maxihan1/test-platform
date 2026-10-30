import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입 } from './helpers/account.helper.js';
import { 주문하나, 회원창열기 } from './helpers/orders-flow.helper.js';
import { 주문관리화면 } from './pages/orders.page.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-112',
  name: '운영툴에서 「배송중」으로 바꾼 주문이 회원 주문 내역에 「배송중」으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '관리자 계정으로 로그인해 있고 일회용 회원에게 결제완료 주문이 있다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 주문관리화면(page);
  const 회원 = { loginId: '', password: '' };
  let 주문 = '';

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 화면.틀.머리줄.waitFor();
    await verify('관리자 계정으로 로그인해 있다', await 화면.틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('일회용 회원에게 결제완료 주문을 만든다', async () => {
    const 가입 = await 회원가입(request);
    회원.loginId = 가입.loginId;
    회원.password = 가입.password;
    주문 = await 주문하나(page, 회원.loginId, '결제완료');
  });

  await test.step('만든 결제완료 주문이 주문 관리 화면에 보이는지 확인한다', async () => {
    await 화면.열기();
    await 화면.주문줄(주문).waitFor();
    await verify('일회용 회원에게 결제완료 주문이 있다', await 화면.상태글자(주문), '결제완료', { blocker: true });
  });

  await test.step('운영툴에서 「배송중」으로 바꾼 뒤 일회용 회원으로 주문 내역을 연다', async () => {
    await 화면.상태바꾸기(주문, '배송중');
    const 창 = await 회원창열기(page, 회원.loginId, 회원.password);
    try {
      const 내역 = new 주문내역화면(창);
      await 내역.열기();
      await 내역.주문줄(주문).waitFor();
      await verify('운영툴에서 「배송중」으로 바꾼 주문이 회원 주문 내역에 「배송중」으로 보인다', (await 내역.상태(주문).innerText()).trim(), '배송중');
    } finally {
      await 창.context().close();
    }
  });
});

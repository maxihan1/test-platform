import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입 } from './helpers/account.helper.js';
import { 주문하나 } from './helpers/orders-flow.helper.js';
import { 주문관리화면 } from './pages/orders.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-073',
  name: '일회용 회원 주문을 찾으면 나중에 만든 주문이 첫 줄에 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '관리자 계정으로 로그인해 있고 일회용 회원에게 결제완료 주문 두 건을 차례로 만들었다',
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
  let 먼저 = '';
  let 나중 = '';

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 화면.틀.머리줄.waitFor();
    await verify('관리자 계정으로 로그인해 있다', await 화면.틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('일회용 회원에게 결제완료 주문 두 건을 차례로 만든다', async () => {
    회원.loginId = (await 회원가입(request)).loginId;
    먼저 = await 주문하나(page, 회원.loginId, '결제완료');
    나중 = await 주문하나(page, 회원.loginId, '결제완료');
  });

  await test.step('만든 주문 두 건이 주문 관리 화면에 보이는지 확인한다', async () => {
    await 화면.열기();
    await 화면.주문줄(나중).waitFor();
    const 상태들 = [await 화면.상태글자(먼저), await 화면.상태글자(나중)].join(', ');
    await verify('일회용 회원에게 결제완료 주문 두 건을 차례로 만들었다', 상태들, '결제완료, 결제완료', { blocker: true });
  });

  await test.step('검색칸에 일회용 회원 아이디를 적는다', async () => {
    await 화면.검색(회원.loginId);
    const 번호들 = await 화면.주문번호들.allInnerTexts();
    const 두건 = await verify('일회용 회원 주문 두 건이 보인다', [...번호들].sort().join(', '), [먼저, 나중].sort().join(', '));
    const 첫줄 = await verify('나중에 만든 주문이 첫 줄에 보인다', 번호들[0], 나중);
    await verify('일회용 회원 주문을 찾으면 나중에 만든 주문이 첫 줄에 보인다', 두건 && 첫줄, true);
  });
});

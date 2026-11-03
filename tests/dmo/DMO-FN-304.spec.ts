import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 시험데이터화면 } from './pages/fixtures.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-304',
  name: '「배송중 주문 1 + 장바구니 2」를 누르면 배송중 주문 칸이 1, 장바구니 칸이 2로 채워진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 시험데이터화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 시험데이터화면.주소);
  });

  await test.step('관리자 로그인을 확인한다', async () => {
    await 화면.그려질때까지();
    await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true, { blocker: true });
  });

  await test.step('빠른 묶음 「배송중 주문 1 + 장바구니 2」를 누른다', async () => {
    await 화면.빠른묶음('배송중 주문 1 + 장바구니 2').click();
    const 배송중 = await verify('배송중 주문 칸이 1이다', await 화면.배송중주문.inputValue(), '1');
    const 장바구니 = await verify('장바구니 칸이 2다', await 화면.장바구니상품.inputValue(), '2');
    await verify('「배송중 주문 1 + 장바구니 2」를 누르면 배송중 주문 칸이 1, 장바구니 칸이 2로 채워진다', 배송중 && 장바구니, true);
  });

  await test.step('빠른 묶음 「주문 상태 하나씩」을 누른다', async () => {
    await 화면.빠른묶음('주문 상태 하나씩').click();
    const 결제완료 = await verify('결제완료 주문 칸이 1이다', await 화면.결제완료주문.inputValue(), '1');
    const 배송중 = await verify('이 묶음의 배송중 주문 칸이 1이다', await 화면.배송중주문.inputValue(), '1');
    const 배송완료 = await verify('배송완료 주문 칸이 1이다', await 화면.배송완료주문.inputValue(), '1');
    const 주문취소 = await verify('주문취소 주문 칸이 1이다', await 화면.주문취소주문.inputValue(), '1');
    await verify('「주문 상태 하나씩」을 누르면 주문 칸 넷이 모두 1로 채워진다', 결제완료 && 배송중 && 배송완료 && 주문취소, true);
  });

  await test.step('빠른 묶음 「빈 장바구니」를 누른다', async () => {
    await 화면.빠른묶음('빈 장바구니').click();
    await verify('「빈 장바구니」를 누르면 장바구니 칸이 0으로 채워진다', await 화면.장바구니상품.inputValue(), '0');
  });

  await test.step('빠른 묶음 「안 읽은 알림 3」을 누른다', async () => {
    await 화면.빠른묶음('안 읽은 알림 3').click();
    await verify('「안 읽은 알림 3」을 누르면 안 읽은 알림 칸이 3으로 채워진다', await 화면.안읽은알림.inputValue(), '3');
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기오늘 } from './helpers/app.helper.js';
import { 카드날짜, 석달넘었나, 최신순인가 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문내역열기 } from './helpers/order.helper.js';
import { 주문내역화면 } from './pages/order-list.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-325',
  name: '「주문 내역」은 주문을 주문일 최신순으로 보여 준다',
  platforms: ['android'],
  precondition: ['주문이 둘 이상 있다', '석 달 넘은 주문이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 내역 = new 주문내역화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('주문 내역을 연다', async () => {
    await 주문내역열기(driver);
    const 카드들 = await 내역.카드들();
    await verify('주문이 둘 이상 있다', 카드들.length >= 2, true, { blocker: true });
    const 날들: (Date | undefined)[] = [];
    for (const 카드 of 카드들) 날들.push(카드날짜(await 내역.카드글들(카드)));
    await verify('「주문 내역」은 주문을 주문일 최신순으로 보여 준다', 최신순인가(날들), true);
  }, { capture: true });

  await test.step('주문 내역을 끝까지 내린다', async () => {
    const 오늘 = await 기기오늘(driver);
    const 모두 = (await 내역.끝까지모은카드글()).map(카드날짜);
    await verify(
      '「주문 내역」은 기간 거르기 없이 석 달 넘은 주문도 보여 준다',
      모두.some((날) => 날 !== undefined && 석달넘었나(날, 오늘)),
      true,
    );
  }, { capture: true });
});

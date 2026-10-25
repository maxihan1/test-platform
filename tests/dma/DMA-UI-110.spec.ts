import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 카드날짜줄, 상품여럿인주문찾기 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문내역열기 } from './helpers/order.helper.js';
import { 주문내역화면 } from './pages/order-list.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-110',
  name: '주문 카드마다 주문번호 · 대표 상품명 · 「{주문일} · {결제 금액}」 · 상태가 보인다',
  platforms: ['android'],
  precondition: ['주문이 하나 이상 있다', '상품이 둘 이상인 주문이 있다'],
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
    await verify('주문이 하나 이상 있다', (await 내역.카드들()).length > 0, true, { blocker: true });
  });

  await test.step('주문 카드를 확인한다', async () => {
    const 번호보임: boolean[] = [];
    const 상품명보임: boolean[] = [];
    const 날짜금액보임: boolean[] = [];
    const 상태보임: boolean[] = [];
    for (const 카드 of await 내역.카드들()) {
      const 글 = await 내역.카드글들(카드);
      const 번호 = (await 내역.카드주문번호보이나(카드)) ? await 내역.카드주문번호(카드) : '';
      const 상태 = (await 내역.카드상태보이나(카드)) ? await 내역.카드상태(카드) : '';
      const 날짜줄 = 카드날짜줄(글);
      번호보임.push(번호 !== '');
      상태보임.push(상태 !== '');
      날짜금액보임.push(날짜줄 !== undefined);
      상품명보임.push(글.some((칸) => 칸.trim() !== '' && 칸 !== 번호 && 칸 !== 상태 && 칸 !== 날짜줄));
    }
    const 주문번호 = await verify('카드마다 주문번호가 보인다', 번호보임.every(Boolean), true);
    const 대표상품명 = await verify('카드마다 대표 상품명이 보인다', 상품명보임.every(Boolean), true);
    const 주문일금액 = await verify('카드마다 「{주문일} · {결제 금액}」이 보인다', 날짜금액보임.every(Boolean), true);
    const 상태 = await verify('카드마다 상태가 보인다', 상태보임.every(Boolean), true);
    await verify(
      '주문 카드마다 주문번호 · 대표 상품명 · 「{주문일} · {결제 금액}」 · 상태가 보인다',
      주문번호 && 대표상품명 && 주문일금액 && 상태,
      true,
    );
  }, { capture: true });

  await test.step('그 주문 카드를 확인한다', async () => {
    const 여럿 = await 상품여럿인주문찾기(driver);
    await verify('상품이 둘 이상인 주문이 있다', 여럿 !== undefined, true, { blocker: true });
    if (여럿 === undefined) return;
    const 카드 = await 내역.주문번호로찾기(여럿.번호);
    const 글 = 카드 === undefined ? [] : await 내역.카드글들(카드);
    await verify('상품이 여러 개인 주문 카드에는 대표 상품명 뒤에 「외 {N}건」이 보인다', 글.some((칸) => / 외 \d+건$/.test(칸)), true);
  }, { capture: true });
});

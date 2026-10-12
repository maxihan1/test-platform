import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 재고많은상품 } from './helpers/shop-tools.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-153',
  name: '수량 1 에서는 「−」 버튼이 꺼져 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  const 많은 = await 재고많은상품(page.request);

  await test.step('상품 상세를 연다', async () => {
    await 상세.열기(많은.id);
    await 상세.화면기다리기();
    await verify('수량 1 에서는 「−」 버튼이 꺼져 있다', await 상세.줄이기.isDisabled(), true);
  });

  await test.step('상품 수량을 10 으로 올린다', async () => {
    await 상세.늘리기누르기(9);
    await verify('수량 10 에서는 「+」 버튼이 꺼져 있다', await 상세.늘리기.isDisabled(), true);
  });
});

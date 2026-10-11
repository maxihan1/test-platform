import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-177',
  name: '수량이 1이면 「−」 버튼이 눌리지 않는다',
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

  await test.step('상품 상세 /shop/1 을 연다', async () => {
    await 상세.열기(1);
    await 상세.화면기다리기();
    await verify('수량이 1이면 「−」 버튼이 눌리지 않는다', await 상세.줄이기.isDisabled(), true);
  });

  await test.step('수량을 최대까지 올린다', async () => {
    await 상세.늘리기누르기(9);
    await verify('수량이 최대면 「+」 버튼이 눌리지 않는다', await 상세.늘리기.isDisabled(), true);
  });
});

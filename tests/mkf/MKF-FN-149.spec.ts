import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 재고많은상품 } from './helpers/shop-tools.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-149',
  name: '「{N}명이 보고 있어요」의 N 은 3~30 사이다',
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
    await 상세.보고있어요.waitFor();
    const 사람수 = await 상세.보고있는수();
    await verify('「{N}명이 보고 있어요」의 N 은 3~30 사이다', 사람수 >= 3 && 사람수 <= 30, true);
  });

  await test.step('상품 상세를 열고 15초를 기다린다', async () => {
    await 상세.열기(많은.id);
    await 상세.화면기다리기();
    await 상세.보고있어요.waitFor();
    await 상세.보고있는수갱신기록하기();
    await page.waitForTimeout(15500);
    const 간격들 = await 상세.보고있는수갱신간격들();
    await verify('보고 있는 사람 수는 5초마다 새로 바뀐다', 간격들.length >= 2 && 간격들.every((간격) => 간격 >= 4000 && 간격 <= 6000), true);
  });
});

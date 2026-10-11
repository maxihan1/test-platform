import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-181',
  name: '상품 목록 처음에는 카테고리가 하나도 골라져 있지 않고 전체 상품 수가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 목록을 연다', async () => {
    await 목록.열기();
    await 목록.첫화면기다리기();
    const 전체 = (await 상품목록(page.request, 'size=1')).total;
    await verify('상품 목록 처음에는 카테고리가 하나도 골라져 있지 않고 전체 상품 수가 보인다', (await 목록.체크된카테고리수()) === 0 && (await 목록.총개수.innerText()) === `총 ${String(전체)}개`, true);
  });
});

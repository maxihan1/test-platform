import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';
import { 상품할인가 } from './helpers/order.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-358',
  name: '수량을 2로 늘리면 「총 상품 금액」이 할인가의 두 배로 바뀐다',
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
    await verify('로그인한 회원이 없다', (await 로그인한아이디(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 상세 화면을 준비한다', async () => {
    await 상세.열기(1);
  });

  await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('상품 상세에서 「수량 늘리기」를 누른다', async () => {
    const 할인가 = await 상품할인가(page.request, 1);
    await 상세.늘리기.click();
    await verify('수량을 2로 늘리면 「총 상품 금액」이 할인가의 두 배로 바뀐다', await 상세.총금액숫자(), 할인가 * 2);
  });
});

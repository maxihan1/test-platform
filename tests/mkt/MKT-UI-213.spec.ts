import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 품절상품 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-213',
  name: '품절 상품 상세에 눌리지 않는 「품절」 버튼이 보인다',
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

  await test.step('품절 상품 상세를 연다', async () => {
    const 품절 = await 품절상품(page.request);
    await 상세.열기(품절.id);
    await 상세.화면기다리기();
    await verify('품절 상품 상세에 눌리지 않는 「품절」 버튼이 보인다', [await 상세.품절버튼.isVisible(), await 상세.품절버튼.isDisabled()], [true, true]);
    await verify('품절 상품 상세에는 「장바구니 담기」 · 「바로 구매」가 보이지 않는다', [await 상세.담기.isVisible(), await 상세.바로구매.isVisible()], [false, false]);
  });
});

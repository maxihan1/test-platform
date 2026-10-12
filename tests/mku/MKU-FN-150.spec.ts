import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-150',
  name: '너비 1280px 상품 목록 첫 줄에 카드 4개가 보인다',
  techniques: ['경계값 분석'],
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

  await test.step('너비 1280px 화면으로 상품 목록을 연다', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await 목록.열기();
    await 목록.첫화면기다리기();
    const 윗자리 = await 목록.카드윗자리들();
    await verify('너비 1280px 상품 목록 첫 줄에 카드 4개가 보인다', 윗자리.filter((자리) => 자리 === 윗자리[0]).length, 4);
    await verify('너비 1280px 상품 목록에서 다섯 번째 카드는 둘째 줄에 보인다', (윗자리[4] ?? 0) > (윗자리[0] ?? 0), true);
  });
});

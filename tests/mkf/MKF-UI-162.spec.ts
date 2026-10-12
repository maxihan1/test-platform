import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-162',
  name: '너비 1280px 상품 목록에는 한 줄에 카드 4장이 보인다',
  precondition: ['화면 너비가 1280px 이다', '화면 너비가 768px 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('상품 목록을 연다', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await verify('화면 너비가 1280px 이다', await page.evaluate(() => window.innerWidth), 1280, { blocker: true });
    const 큰윗자리 = await 목록.카드윗자리들();
    await verify('너비 1280px 상품 목록에는 한 줄에 카드 4장이 보인다', 큰윗자리.filter((자리) => 자리 === 큰윗자리[0]).length, 4);
    await page.setViewportSize({ width: 768, height: 900 });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await verify('화면 너비가 768px 이다', await page.evaluate(() => window.innerWidth), 768, { blocker: true });
    const 작은윗자리 = await 목록.카드윗자리들();
    await verify('너비 768px 상품 목록에는 한 줄에 카드 2장이 보인다', 작은윗자리.filter((자리) => 자리 === 작은윗자리[0]).length, 2);
  });
});

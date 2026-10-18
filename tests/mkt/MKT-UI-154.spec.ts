import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-154',
  name: '너비 1280px 에서는 상품 카드가 한 줄에 4개씩 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['화면 너비가 1280px 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('너비 1280px 로 상품 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await 목록.열기();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('너비 1280px 에서는 상품 카드가 한 줄에 4개씩 보인다', await 목록.한줄에보이는카드수(), 4);
  });

  await test.step('화면 너비를 768px 로 줄인다', async () => {
    await page.setViewportSize({ width: 768, height: 720 });
    await verify('너비 768px 에서는 상품 카드가 한 줄에 2개씩 보인다', await 목록.한줄에보이는카드수(), 2);
  });
});
